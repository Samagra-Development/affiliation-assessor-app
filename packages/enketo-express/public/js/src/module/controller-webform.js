/**
 * Deals with the main high level survey controls: saving, submitting etc.
 */

import gui from './gui';
import connection from './connection';
import settings from './settings';
import { Form } from 'enketo-core';
import downloadUtils from 'enketo-core/src/js/download-utils';
import events from './event';
import fileManager from './file-manager';
import { t, localize, getCurrentUiLanguage, getBrowserLanguage } from './translator';
import records from './records-queue';
import $ from 'jquery';
import encryptor from './encryptor';
import formCache from './form-cache';
import { getLastSavedRecord, populateLastSavedInstances } from './last-saved';
import { FormController } from './form-controller';

const cronInterval = setInterval(async () => {
    connection.getOnlineStatus()
        .then(appearsOnline => {
            console.log(appearsOnline)
            if (!appearsOnline) {
            }
        })
}, 5000);

function getMeta(metaName) {
    return document.querySelector(`meta[name=${metaName}]`).content;
}

/**
 * @typedef {import('../../../../app/models/survey-model').SurveyObject} Survey
 */

/** @type {Form} */
let form;

let formData;

let formprogress;
const formOptions = {
    printRelevantOnly: settings.printRelevantOnly,
};

/**
 * @typedef InstanceAttachment
 * @property {string} filename
 */

/**
 * @typedef ControllerWebformInitData
 * @property {string} modelStr
 * @property {string} instanceStr
 * @property {Document[]} external
 * @property {Survey} survey
 * @property {InstanceAttachment[]} [instanceAttachments]
 */

/**
 * @param {Element} formEl
 * @param {ControllerWebformInitData} data
 * @param {string[]} [loadErrors]
 * @return {Promise<Form>}
 */
function init(formEl, data, loadErrors = []) {
    formData = data;

    return _initializeRecords()
        .then(_checkAutoSavedRecord)
        .then(record => {
            if (!data.instanceStr && record && record.xml) {
                records.setActive(records.getAutoSavedKey());
                data.instanceStr = record.xml;
            }

            if (record && record.draft) {
                // Make sure that Enketo Core won't do the instanceID --> deprecatedID move
                data.submitted = false;
            }

            if (data.instanceAttachments) {
                fileManager.setInstanceAttachments(data.instanceAttachments);
            }

            const langSelector = formEl.querySelector('#form-languages');
            const formDefaultLanguage = langSelector ? langSelector.dataset.defaultLang : undefined;
            const browserLanguage = getBrowserLanguage();

            // Determine which form language to load
            if (settings.languageOverrideParameter) {
                formOptions.language = settings.languageOverrideParameter.value;
            } else if (!formDefaultLanguage && langSelector && langSelector.querySelector(`option[value="${browserLanguage}"]`)) {
                formOptions.language = browserLanguage;
            }

            form = new Form(formEl, data, formOptions);
            loadErrors = loadErrors.concat(form.init());

            // Determine whether UI language should be attempted to be switched.
            if (getCurrentUiLanguage() !== form.currentLanguage && /^[a-z]{2,3}/.test(form.currentLanguage)) {
                localize(document.querySelector('body'), form.currentLanguage)
                    .then(dir => document.querySelector('html').setAttribute('dir', dir));
            }

            // Remove loader. This will make the form visible.
            // In order to aggregate regular loadErrors and GoTo loaderrors,
            // this is placed in between form.init() and form.goTo().
            $('.main-loader').remove();

            if (settings.goTo && location.hash) {
                loadErrors = loadErrors.concat(form.goTo(decodeURIComponent(location.hash.substring(1)).split('#')[0]));
            }

            if (form.encryptionKey) {
                const saveDraftButton = document.querySelector('.form-footer#save-draft');
                if (saveDraftButton) {
                    saveDraftButton.remove();
                }
                if (!encryptor.isSupported()) {
                    loadErrors.unshift(t('error.encryptionnotsupported'));
                }
            }

            formprogress = document.querySelector('.form-progress');

            _setEventHandlers(data.survey);
            setLogoutLinkVisibility();

            if (loadErrors.length > 0) {
                throw loadErrors;
            }

            return form;
        });
}

function _initializeRecords() {
    if (!settings.offline) {
        return Promise.resolve();
    }

    return records.init();
}

function _checkAutoSavedRecord() {
    let rec;
    if (!settings.offline) {
        return Promise.resolve();
    }

    return records.getAutoSavedRecord()
        .then(record => {
            if (record) {
                rec = record;

                return gui.confirm({
                    heading: t('confirm.autosaveload.heading'),
                    msg: t('confirm.autosaveload.msg'),

                }, {
                    posButton: t('confirm.autosaveload.posButton'),
                    negButton: t('confirm.autosaveload.negButton'),
                    allowAlternativeClose: false
                });
            }
        })
        .then(confirmed => {
            if (confirmed) {
                return rec;
            }
            if (rec) {
                records.removeAutoSavedRecord();
            }
        });
}

/**
 * @typedef ResetFormOptions
 * @property {boolean} [isOffline]
 */

/**
 * Controller function to reset to the initial state of a form.
 *
 * Note: Previously this function accepted a boolean `confirmed` parameter, presumably
 * intending to block the reset behavior until user confirmation of save. But this
 * parameter was always passed as `true`. Relatedly, the `FormReset` event fired here
 * previously indirectly triggered `formCache.updateMedia` method, but it was triggered
 * with stale `survey` state, overwriting any changes to `survey.externalData`
 * referencing last-saved instances.
 *
 * That event listener has been removed in favor of calling `updateMedia` directly with
 * the current state of `survey` in offline mode. This change is being called out in
 * case the removal of that event listener impacts downstream forks.
 *
 * @param {Survey} survey
 * @param {ResetFormOptions} [options]
 * @return {Promise<void>}
 */
function _resetForm(survey, options = {}) {
    return getLastSavedRecord(survey.enketoId)
        .then(lastSavedRecord => populateLastSavedInstances(survey, lastSavedRecord))
        .then(survey => {
            const formEl = form.resetView();

            form = new Form(formEl, {
                modelStr: formData.modelStr,
                external: survey.externalData,
            }, formOptions);

            const loadErrors = form.init();

            // formreset event will update the form media:
            form.view.html.dispatchEvent(events.FormReset());

            if (options.isOffline) {
                formCache.updateMedia(survey);
            }

            if (records) {
                records.setActive(null);
            }

            if (loadErrors.length > 0) {
                gui.alertLoadErrors(loadErrors);
            }
        });
}
/**
 * Loads a record from storage
 *
 * @param  { string } instanceId - [description]
 * @param  {=boolean?} confirmed -  [description]
 */
function _loadRecord(instanceId, confirmed) {
    let texts;
    let choices;
    let loadErrors;

    if (!confirmed && form.editStatus) {
        texts = {
            msg: t('confirm.discardcurrent.msg'),
            heading: t('confirm.discardcurrent.heading')
        };
        choices = {
            posButton: t('confirm.discardcurrent.posButton'),
        };
        gui.confirm(texts, choices)
            .then(confirmed => {
                if (confirmed) {
                    _loadRecord(instanceId, true);
                }
            });
    } else {
        records.get(instanceId)
            .then(record => {
                if (!record || !record.xml) {
                    return gui.alert(t('alert.recordnotfound.msg'));
                }

                const formEl = form.resetView();
                console.log("FORM-XML", record.xml);
                form = new Form(formEl, {
                    modelStr: formData.modelStr,
                    instanceStr: record.xml,
                    external: formData.external,
                    submitted: false
                }, formOptions);
                loadErrors = form.init();
                // formreset event will update the form media:
                form.view.html.dispatchEvent(events.FormReset());
                form.recordName = record.name;
                records.setActive(record.instanceId);

                if (loadErrors.length > 0) {
                    throw loadErrors;
                } else {
                    gui.feedback(t('alert.recordloadsuccess.msg', {
                        recordName: record.name
                    }), 2);
                }
                $('.side-slider__toggle.close').click();
            })
            .catch(errors => {
                console.error('load errors: ', errors);
                if (!Array.isArray(errors)) {
                    errors = [errors.message];
                }
                gui.alertLoadErrors(errors, t('alert.loaderror.editadvice'));
            });
    }
}

/**
 * Used to submit a form.
 * This function does not save the record in the browser storage
 * and is not used in offline-capable views.
 *
 * @param {Survey} survey
 */
function _submitRecord(survey) {
    const redirect = settings.type === 'single' || settings.type === 'edit' || settings.type === 'view';
    let beforeMsg;
    let authLink;
    let level;
    let msg = '';
    const include = { irrelevant: true };

    form.view.html.dispatchEvent(events.BeforeSave());

    beforeMsg = (redirect) ? t('alert.submission.redirectmsg') : '';
    authLink = `<a href="${settings.loginUrl}" target="_blank">${t('here')}</a>`;

    // gui.alert(`${beforeMsg}<div class="loader-animation-small" style="margin: 40px auto 0 auto;"/>`, t('alert.submission.msg'), 'bare');

    return fileManager.getCurrentFiles()
        .then(files => {
            const record = {
                enketoId: settings.enketoId,
                xml: form.getDataStr(include),
                files: files,
                instanceId: form.instanceID,
                deprecatedId: form.deprecatedID
            };

            if (form.encryptionKey) {
                const formProps = {
                    encryptionKey: form.encryptionKey,
                    id: form.id,
                    version: form.version,
                };

                return encryptor.encryptRecord(formProps, record);
            } else {
                return record;
            }
        })
        .then(record => connection.uploadRecord(survey, record))
        .then(result => {
            result = result || {};
            level = result.status || 'success';

            if (result.failedFiles && result.failedFiles.length > 0) {
                msg = `${t('alert.submissionerror.fnfmsg', {
                    failedFiles: result.failedFiles.join(', '),
                    supportEmail: settings.supportEmail
                })}<br/>`;
                level = 'warning';
            }
            msg = result.message;
        })
        .then(() => {
            // this event is used in communicating back to iframe parent window
            document.dispatchEvent(events.SubmissionSuccess()); //Arun

            let heading = '';
            if (level === 'success') {
                heading = t('alert.submissionsuccess.heading');
            } else if (level === 'warning') {
                heading = t('alert.submissionwarning.heading');
            } else if (level === 'offline') {
                heading = "You are offline";
                level = 'warning';
            } else {
                heading = t('alert.submissionerror.heading');
            }

            if (redirect) {
                if (!settings.multipleAllowed) {
                    const now = new Date();
                    const age = 31536000;
                    const d = new Date();
                    /**
                     * Manipulate the browser history to work around potential ways to
                     * circumvent protection against multiple submissions:
                     * 1. After redirect, click Back button to load cached version.
                     */
                    history.replaceState({}, '', `${settings.defaultReturnUrl}?taken=${now.getTime()}`);
                    /**
                     * The above replaceState doesn't work in Safari and probably in
                     * some other browsers (mobile). It shows the
                     * final submission dialog when clicking Back.
                     * So we remove the form...
                     */
                    $('form.or').empty();
                    $('button#submit-form').remove();
                    d.setTime(d.getTime() + age * 1000);
                    document.cookie = `${settings.enketoId}=${now.getTime()};path=${settings.basePath}/single;max-age=${age};expires=${d.toGMTString()};`;
                }
                // msg += t( 'alert.submissionsuccess.redirectmsg' );


                // gui.alert(msg, heading, level);
                setTimeout(() => {
                    location.href = decodeURIComponent(settings.returnUrl || settings.defaultReturnUrl);
                }, 1200);
            } else {
                //msg = ( msg.length > 0 ) ? msg : t( 'alert.submissionsuccess.msg' );
                // gui.alert(msg, heading, level);
                _resetForm(survey);
            }
        })
        .catch(result => {
            // let message;
            // result = result || {};
            gui.alert(msg, t('alert.submissionerror.heading'), level);
            // if ( result.status === 401 ) {
            //     message = t( 'alert.submissionerror.authrequiredmsg', {
            //         here: authLink,
            //         // switch off escaping just for this known safe value
            //         interpolation: {
            //             escapeValue: false
            //         }
            //     } );
            // } else {
            //     message = result.message || gui.getErrorResponseMsg( result.status );
            // }
            // gui.alert( message, t( 'alert.submissionerror.heading' ) );
        });
}

function _getRecordName() {
    return records.getCounterValue(settings.enketoId)
        .then(count => form.instanceName || form.recordName || `${form.surveyName} - ${count}`);
}

function _confirmRecordName(recordName, errorMsg) {
    const texts = {
        msg: '',
        heading: t('formfooter.savedraft.label'),
        errorMsg
    };
    const choices = {
        posButton: t('confirm.save.posButton'),
        negButton: t('confirm.default.negButton')
    };
    const inputs = `<label><span>${t('confirm.save.name')}</span><span class="or-hint active">${t('confirm.save.hint')}</span><input name="record-name" type="text" value="${recordName}"required /></label>`;

    return gui.prompt(texts, choices, inputs)
        .then(values => {
            if (values) {
                return values['record-name'];
            }
            throw new Error('Cancelled by user');
        });
}

// Save the translations in case ever required in the future, by leaving this comment in:
// t( 'confirm.save.renamemsg', {} )

/**
 * @param {Survey} survey
 * @param {boolean} [draft]
 * @param {string} [recordName]
 * @param {boolean} [confirmed]
 * @param {string} [errorMsg]
 */
function _saveRecord(survey, draft = true, recordName, confirmed, errorMsg) {
    const include = { irrelevant: true };

    // triggering "before-save" event to update possible "timeEnd" meta data in form
    form.view.html.dispatchEvent(events.BeforeSave());

    // check recordName
    if (!recordName) {
        return _getRecordName()
            .then(name => _saveRecord(survey, draft, name, false, errorMsg));
    }

    // check whether record name is confirmed if necessary
    // if (draft && !confirmed) {
    //     return _confirmRecordName(recordName, errorMsg)
    //         .then(name => _saveRecord(survey, draft, name, true))
    //         .catch(() => { });
    // }

    return fileManager.getCurrentFiles()
        .then(files => {
            let formStr = form.getDataStr(include);
            let modelStr = form.model.data.modelStr;

            // dynamic changes

            let indexValue;
            let templateElements;
            let parser = new DOMParser();
            const docString = parser.parseFromString(form.model.data.modelStr, 'text/xml');
            let formString1 = form.getDataStr(include);
            let modelString1 = form.model.data.modelStr;
            let splitModelStr = formString1.split("\n");
            // No input in institue code or 0 input
            const splitString = formString1.split("\n");
            for(let i = 0; i < splitString.length;i++) {
                console.log(splitString[i]);
                if(splitString[i].includes('count/') === true) {
                    indexValue = splitModelStr.findIndex(a => {return a.indexOf("count/") !== -1});
                    if(splitModelStr[indexValue + 1] && splitModelStr[indexValue + 1].includes('template')) {
                        let elem = splitModelStr[indexValue]?.trim();
                        console.log(elem);
                        let subElem = elem.substring(1, elem.length - 2);
                        console.log("subElem =>", elem);
                        let element = docString.getElementsByTagName(subElem);
                        let templateElem = element[0].nextElementSibling;
                        templateElements.push(templateElem);
                    }
                }
                console.log("tempElements =>", templateElements);
            }

            // No input in institue code or 0 input
            if (formStr.includes('<R1_count/>')) {
                const strToAdd = modelStr.slice(modelStr.lastIndexOf("<R1_count/>") + 11, modelStr.lastIndexOf("</R1>") + 5)
                formStr = formStr.replace("<R1_count/>", `<R1_count/>${strToAdd}`);
            } else {
                let xmlDoc;
                let parser;
            
                if (window.DOMParser) {
                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString(form.getDataStr(include), "text/xml");
                }
                else // Internet Explorer
                {
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = false;
                    xmlDoc.loadXML(form.getDataStr(include));
                }
            
                let repeatCount = xmlDoc.getElementsByTagName("R1_count")[0].childNodes[0].nodeValue;
            
                if (repeatCount == 0 || repeatCount == "") {
                    const strToAdd = modelStr.slice(modelStr.lastIndexOf("<R1_count/>") + 11, modelStr.lastIndexOf("</R1>") + 5)
                    formStr = formStr.replace("</R1_count>", `</R1_count>${strToAdd}`);
                } 
            }
            const record = {
                'draft': draft,
                'xml': formStr,
                'name': recordName,
                'instanceId': form.instanceID,
                'deprecateId': form.deprecatedID,
                'enketoId': settings.enketoId,
                'files': files
            };

            // encrypt the record
            if (form.encryptionKey && !draft) {
                const formProps = {
                    encryptionKey: form.encryptionKey,
                    id: form.id,
                    version: form.version,
                };

                return encryptor.encryptRecord(formProps, record);
            } else {
                return record;
            }
        }).then(record => {
            // Change file object for database, not sure why this was chosen.
            record.files = record.files.map(file => (typeof file === 'string') ? {
                name: file
            } : {
                name: file.name,
                item: file
            });

            // Save the record, determine the save method
            const saveMethod = form.recordName ? 'update' : 'set';

            console.log("saving")
            console.log(record)
            console.log(record.xml)
            //document.dispatchEvent(events.Save()); //Arun
            window.parent.postMessage(JSON.stringify({
                formData: record,
            }), '*');
            return records.save(saveMethod, record);
        })
        .then(() => {

            records.removeAutoSavedRecord();
            // _resetForm(survey, { isOffline: true });

            if (draft) {
                gui.alert(t('alert.recordsavesuccess.draftmsg'), t('alert.savedraftinfo.heading'), 'info', 5);
            } else {
                gui.alert(`${t('record-list.msg2')}`, t('alert.recordsavesuccess.finalmsg'), 'info', 10);
                // The timeout simply avoids showing two messages at the same time:
                // 1. "added to queue"
                // 2. "successfully submitted"
                setTimeout(records.uploadQueue, 10 * 1000);
            }
        })
        .catch(error => {
            console.error('save error', error);
            errorMsg = error.message;
            if (!errorMsg && error.target && error.target.error && error.target.error.name && error.target.error.name.toLowerCase() === 'constrainterror') {
                errorMsg = t('confirm.save.existingerror');
            } else if (!errorMsg) {
                errorMsg = t('confirm.save.unkownerror');
            }
            // gui.alert(errorMsg, 'Save Error');
        });
}

function _autoSaveRecord() {
    // Do not auto-save a record if the record was loaded from storage
    // or if the form has enabled encryption
    if (form.recordName || form.encryptionKey) {
        return Promise.resolve();
    }

    return fileManager.getCurrentFiles()
        .then(files => {
            // build the variable portions of the record object
            const record = {
                'xml': form.getDataStr(),
                'files': files.map(file => (typeof file === 'string') ? {
                    name: file
                } : {
                    name: file.name,
                    item: file
                })
            };

            return records.updateAutoSavedRecord(record);
        })
        .then(() => {
            console.log('autosave successful');
        })
        .catch(error => {
            console.error('autosave error', error);
        });
}

/**
 * @param {Survey} survey
 */
function _setEventHandlers(survey) {
    const $doc = $(document);

    $('button#submit-form').click(function () {
        const $button = $(this);
        $button.btnBusyState(true);
        setTimeout(() => {
            form.validate()
                .then(valid => {
                    if (valid) {
                        if (settings.offline) {
                            return _saveRecord(survey, false);
                        } else {
                            return _submitRecord(survey);
                        }
                    } else {
                        gui.alert(t('alert.validationerror.msg'));
                    }
                })
                .catch(e => {
                    gui.alert(e.message);
                })
                .then(() => {
                    $button.btnBusyState(false);
                });
        }, 100);

        return false;
    });

    const draftButton = document.querySelector('button#save-draft');
    if (draftButton) {
        draftButton.addEventListener('click', event => {
            if (!event.target.matches('.save-draft-info')) {
                const $button = $(draftButton);
                $button.btnBusyState(true);
                setTimeout(() => {
                    _saveRecord(survey, true)
                        .then(() => {
                            $button.btnBusyState(false);
                        })
                        .catch(e => {
                            $button.btnBusyState(false);
                            throw e;
                        });
                }, 100);
            }
        });
    }

    $('button#validate-form:not(.disabled)').click(function () {
        if (typeof form !== 'undefined') {
            const $button = $(this);
            $button.btnBusyState(true);
            setTimeout(() => {
                form.validate()
                    .then(valid => {
                        $button.btnBusyState(false);
                        if (!valid) {
                            gui.alert(t('alert.validationerror.msg'));
                        } else {
                            gui.alert(t('alert.validationsuccess.msg'), t('alert.validationsuccess.heading'), 'success');
                        }
                    })
                    .catch(e => {
                        gui.alert(e.message);
                    })
                    .then(() => {
                        $button.btnBusyState(false);
                    });
            }, 100);
        }

        return false;
    });

    $('button#close-form:not(.disabled)').click(() => {
        const msg = t('alert.submissionsuccess.redirectmsg');
        document.dispatchEvent(events.Close());
        gui.alert(msg, t('alert.closing.heading'), 'warning');
        setTimeout(() => {
            location.href = decodeURIComponent(settings.returnUrl || settings.defaultReturnUrl);
        }, 300);

        return false;
    });

    $('.record-list__button-bar__button.upload').on('click', () => {
        records.uploadQueue();
    });

    $('.record-list__button-bar__button.export').on('click', () => {
        const downloadLink = '<a class="vex-dialog-link" id="download-export" href="#">download</a>';

        records.exportToZip(form.surveyName)
            .then(zipFile => {
                gui.alert(t('alert.export.success.msg') + downloadLink, t('alert.export.success.heading'), 'normal');
                updateDownloadLinkAndClick(document.querySelector('#download-export'), zipFile);
            })
            .catch(error => {
                let message = t('alert.export.error.msg', {
                    errors: error.message,
                    interpolation: {
                        escapeValue: false
                    }
                });
                if (error.exportFile) {
                    message += `<p>${t('alert.export.error.filecreatedmsg')}</p>${downloadLink}`;
                }
                gui.alert(message, t('alert.export.error.heading'));
                if (error.exportFile) {
                    updateDownloadLinkAndClick(document.querySelector('#download-export'), error.exportFile);
                }
            });
    });

    $doc.on('click', '.record-list__records__record[data-draft="true"]', function () {
        _loadRecord($(this).attr('data-id'), false);
    });

    $doc.on('click', '.record-list__records__record', function () {
        $(this).next('.record-list__records__msg').toggle(100);
    });

    document.addEventListener(events.ProgressUpdate().type, event => {
        if (event.target.classList.contains('or') && formprogress && event.detail) {
            formprogress.style.width = `${event.detail}%`;
        }
    });

    document.addEventListener(events.Edited().type, async event => {
        const formController = new FormController({});
        const userId = getMeta('userId');
        const keyToStorage = `${userId}_${form.model.rootElement.id}_${new Date().toISOString().split("T")[0]}`;
        let olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
        if(olderFiles) {
            //clear the previously stored files
            localStorage.setItem(keyToStorage, JSON.stringify({}));
        }
        await formController.broadcastFormDataUpdate(form.getDataStr(), {});
    });

    if (inIframe() && settings.parentWindowOrigin) {
        document.addEventListener(events.SubmissionSuccess().type, postEventAsMessageToParentWindow);
        document.addEventListener(events.Edited().type, postEventAsMessageToParentWindow);
        document.addEventListener(events.Close().type, postEventAsMessageToParentWindow);
        document.addEventListener(events.Save().type, postEventAsMessageToParentWindow);//arun
        document.addEventListener(events.InstanceFirstLoad().type, postEventAsMessageToParentWindow); // roopa

    }

    document.addEventListener(events.QueueSubmissionSuccess().type, event => {
        const successes = event.detail;
        gui.feedback(t('alert.queuesubmissionsuccess.msg', {
            count: successes.length,
            recordNames: successes.join(', ')
        }), 7);
    });

    // This actually belongs in gui.js but that module doesn't have access to the form object.
    // Enketo core takes care of language switching of the form itself, i.e. all language strings in the form definition.
    // This handler does the UI around the form, as well as the UI inside the form that are part of the application.
    const formLanguages = document.querySelector('#form-languages');
    if (formLanguages) {
        formLanguages.addEventListener(events.Change().type, event => {
            event.preventDefault();
            console.log('ready to set UI lang', form.currentLanguage);
            localize(document.querySelector('body'), form.currentLanguage)
                .then(dir => document.querySelector('html').setAttribute('dir', dir));
        });
    }


    document.addEventListener(events.XFormsValueChanged().type, async (e) => {
        const formController = new FormController({});
        const userId = getMeta('userId');
        const keyToStorage = `${userId}_${form.model.rootElement.id}_${new Date().toISOString().split("T")[0]}`;
        let olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
        await formController.broadcastFormDataUpdate(form.getDataStr(), olderFiles);
        let arrayOfFileURLs = {};
        if (e.target.nodeName === "INPUT" && e.target.type === "file") {
            if(e.target.value === '' && olderFiles[e.target.name] !== undefined) {
                delete olderFiles[e.target.name];
                localStorage.setItem(keyToStorage, JSON.stringify(olderFiles));
            }
            const formFiles = await fileManager.getCurrentFiles();
            if (formFiles) {
                // console.log("formFiles: " + formFiles?.length)
                if (formFiles?.length) {
                    for (let i = 0; i < formFiles.length; i++) {
                        const file = formFiles[i];
                        const parts = e.target.name.split("/").slice();
                        const lastPart = parts[parts.length - 1]
                        // if (typeof file === 'object' && file.name.includes(lastPart)) {
                            if (typeof file === 'object') {
                                if (file?.name?.includes(e?.target?.name?.slice(e?.target?.name?.lastIndexOf("/") + 1))) {
                                    const fileURL = await formController.uploadFile(file);
                                    if (fileURL) {
                                        // console.log({ fileURL });
                                        arrayOfFileURLs[e.target.name] = { url: fileURL, name: file.name, ref: e.target.name };
                                        // Broadcast File Remove
                                        olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
                                        const arrayOfFileURLsNew = { ...olderFiles, ...arrayOfFileURLs };
                                        // for (const [key, value] of Object.entries(olderFiles)) {
                                        //     if (arrayOfFileURLs[key] !== undefined && value.url !== '') {
                                        //         arrayOfFileURLsNew[key] = value;
                                        //     }
                                        // }
                                        if (olderFiles && olderFiles !== undefined) {
                                            for (const [key, value] of Object.entries(olderFiles)) {
                                                if (arrayOfFileURLsNew[key] === undefined) {
                                                    arrayOfFileURLsNew[key] = { url: '', name: '', ref: '' }
                                                }
                                            }
                                        }
                                        localStorage.setItem(keyToStorage, JSON.stringify(arrayOfFileURLsNew));
                                        await formController.broadcastFormDataUpdate(form.getDataStr(), arrayOfFileURLsNew);
                                    }
                                }
                            } else {
                                if (file?.includes(e?.target?.name?.slice(e?.target?.name?.lastIndexOf("/") + 1))) {
                                    if (file.includes("storage.googleapis.com")) {
                                        if (e.target.value === '') {
                                            olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
                                            // olderFiles[e.target.name] = { url: '', name: '', ref: '' }
                                            olderFiles[e.target.name] = { url: file, name: file.name, ref: e.target.name };
                                            localStorage.setItem(keyToStorage, JSON.stringify(olderFiles));
                                            olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
                                            await formController.broadcastFormDataUpdate(form.getDataStr(), olderFiles);
                                        } else {
                                            console.info("File has already been uploaded");
                                        }
                                    } else {
                                        arrayOfFileURLs[e.target.name] = { url: '', name: '', ref: '' }
                                        // Broadcast File Remove
                                        const arrayOfFileURLsNew = { ...arrayOfFileURLs, ...olderFiles };
                                        if (olderFiles && olderFiles !== undefined) {
                                            for (const [key, value] of Object.entries(olderFiles)) {
                                                if (arrayOfFileURLs[key] === undefined) {
                                                    arrayOfFileURLsNew[key] = { url: '', name: '', ref: '' }
                                                }
                                            }
                                        }
                                        localStorage.setItem(keyToStorage, JSON.stringify(arrayOfFileURLsNew));
                                        olderFiles = JSON.parse(localStorage.getItem(keyToStorage)) || {};
                                        await formController.broadcastFormDataUpdate(form.getDataStr(), arrayOfFileURLsNew);
                                    }
                                }
                                // await formController.broadcastFormDataUpdate(form.getDataStr(), olderFiles);
                            }
                    }
                }
            } else if(olderFiles) {
                localStorage.setItem(keyToStorage, JSON.stringify(olderFiles));
                await formController.broadcastFormDataUpdate(form.getDataStr(), olderFiles);
            }
            // Broadcast File Remove
            // const arrayOfFileURLsNew = { ...olderFiles, ...arrayOfFileURLs };
            // if (olderFiles && olderFiles !== undefined) {
            //     for (const [key, value] of Object.entries(olderFiles)) {
            //         if (arrayOfFileURLs[key] === undefined) {
            //             arrayOfFileURLsNew[key] = { url: '', name: '', ref: '' }
            //         }
            //     }
            // }
            // localStorage.setItem(`${form.model}_${new Date().toISOString().split("T")[0]}`, JSON.stringify(arrayOfFileURLsNew));
            // await formController.broadcastFormDataUpdate(form.getDataStr(), arrayOfFileURLsNew);
        }
    });
    if (settings.offline) {
        document.addEventListener(events.XFormsValueChanged().type, () => {
            // The delay works around an issue with drawing widgets, where the canvas
            // capture is an empty image. https://github.com/enketo/enketo-express/issues/174
            // const formController = new FormController();
            // formController.broadcastFormDataUpdate(form.getDataStr());
            setTimeout(_autoSaveRecord, 500);
        });
    }
}

function updateDownloadLinkAndClick(anchor, file) {
    const objectUrl = URL.createObjectURL(file);

    anchor.textContent = file.name;
    downloadUtils.updateDownloadLink(anchor, objectUrl, file.name);
    anchor.click();
}

function setLogoutLinkVisibility() {
    const visible = document.cookie.split('; ').some(rawCookie => rawCookie.indexOf('__enketo_logout=') !== -1);
    $('.form-footer .logout').toggleClass('hide', !visible);
}

/**
 * Determines whether the page is loaded inside an iframe
 *
 * @return { boolean } [description]
 */
function inIframe() {
    try {
        // document.dispatchEvent(events.InstanceFirstLoad());
        // window.parent.postMessage('xFormLoaded');
        const record = {
                'draft': '',
                'xml': '',
                'name': '',
                'instanceId': '',
                'deprecateId': '',
                'enketoId': '',
                'files': '',
                'instance': 'formLoad'
        };
        window.parent.postMessage(JSON.stringify({
            formData: record
        }), '*');
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

/**
 * Attempts to send a message to the parent window, useful if the webform is loaded inside an iframe.
 *
 * @param  {Event} event - event
 */
function postEventAsMessageToParentWindow(event) {
    if (event && event.type) {
        try {
            window.parent.postMessage(JSON.stringify({
                enketoEvent: event.type
            }), settings.parentWindowOrigin);
        } catch (error) {
            console.error(error);
        }
    }
}

export default {
    init,
    setLogoutLinkVisibility,
    inIframe,
    postEventAsMessageToParentWindow
};
