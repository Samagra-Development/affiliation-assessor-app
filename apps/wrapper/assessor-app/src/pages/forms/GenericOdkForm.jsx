import React, { useState, useEffect, useContext, useRef } from "react";
import { Routes, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import ROUTE_MAP from "../../routing/routeMap";
import { StateContext } from "../../App";

import {
  getStatusOfForms,
  registerEvent,
  saveFormSubmission,
  updateFormStatus,
} from "../../api";
import {
  getCookie,
  getFormData,
  handleFormEvents,
  updateFormData,
  removeItemFromLocalForage,
  getSpecificDataFromForage,
  getLocalTimeInISOFormat,
} from "../../utils";

import CommonLayout from "../../components/CommonLayout";
import CommonModal from "../../components/Modal";

const ENKETO_MANAGER_URL = process.env.REACT_APP_ENKETO_MANAGER_URL;
const ENKETO_URL = process.env.REACT_APP_ENKETO_URL;

const GenericOdkForm = (props) => {
  const user = getCookie("userData");
  let { formName, date } = useParams();
  const scheduleId = useRef();
  const [isPreview, setIsPreview] = useState(false);
  let formSpec = {
    forms: {
      [formName]: {
        skipOnSuccessMessage: true,
        prefill: {},
        submissionURL: "",
        name: formName,
        successCheck: "async (formData) => { return true; }",
        onSuccess: {
          notificationMessage: "Form submitted successfully",
          sideEffect: "async (formData) => { console.log(formData); }",
        },
        onFailure: {
          message: "Form submission failed",
          sideEffect: "async (formData) => { console.log(formData); }",
          next: {
            type: "url",
            id: "google",
          },
        },
      },
    },
    start: formName,
    date: date,
    metaData: {},
  };

  const { state } = useContext(StateContext);

  const getFormURI = (form, ofsd, prefillSpec) => {
    return encodeURIComponent(
      `${ENKETO_MANAGER_URL}/prefillXML?formUrl=${form}&onFormSuccessData=${encodeFunction(
        ofsd
      )}&prefillSpec=${encodeFunction(prefillSpec)}`
    );
  };

  const navigate = useNavigate();
  const encodeFunction = (func) => encodeURIComponent(JSON.stringify(func));
  const startingForm = formSpec.start;
  const [formId, setFormId] = useState(startingForm);
  const [encodedFormSpec, setEncodedFormSpec] = useState(
    encodeURI(JSON.stringify(formSpec.forms[formId]))
  );
  const [onFormSuccessData, setOnFormSuccessData] = useState(undefined);
  const [onFormFailureData, setOnFormFailureData] = useState(undefined);
  const [encodedFormURI, setEncodedFormURI] = useState("");
  const [prefilledFormData, setPrefilledFormData] = useState();
  const [errorModal, setErrorModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  let previewFlag = false;

  const loading = useRef(false);
  const [assData, setData] = useState({
    district: "",
    instituteName: "",
    nursing: "",
    paramedical: "",
    type: "",
    latitude: null,
    longitude: null,
  });

  const getFormStatus = async () => {
    const { user } = getCookie("userData");

    const postData = {
      date: new Date().toJSON().slice(0, 10),
      assessor_id: user.id,
    };

    try {
      const response = await getStatusOfForms(postData);
      let formStatus = response?.data?.form_submissions;
      formStatus = formStatus.map((obj) => {
        return obj.form_name;
      });
      let isComplete = false;
      let parent_form_id = Object.values(getCookie("courses_data"))[0];
      if (
        Object.keys(getCookie("courses_data")).length ===
        response?.data?.form_submissions.length
      ) {
        Object.keys(getCookie("courses_data")).forEach((form) => {
          response?.data?.form_submissions.filter((item) => {
            if (item.form_name === form && item.submission_status)
              isComplete = true;
            else isComplete = false;
          });
        });
      }

      if (isComplete) {
        // call event
        registerEvent({
          created_date: getLocalTimeInISOFormat(),
          entity_id: `${parent_form_id}`,
          entity_type: "form",
          event_name: "OGA Completed",
          remarks: `${user.firstName} ${user.lastName} has completed the On Ground Inspection Analysis`,
        });
        updateFormStatus({
          form_id: `${parent_form_id}`,
          form_status: "OGA Completed",
        });
      }
    } catch (error) {
      navigate(ROUTE_MAP.login);
    }
  };

  async function afterFormSubmit(e, saveFlag) {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;

    try {
      const { nextForm, formData, onSuccessData, onFailureData } = data;
      if (data?.state === "ON_FORM_SUCCESS_COMPLETED") {
        if (!previewFlag) {
          handleRenderPreview();
        } else {
          // For read-only forms, it will disable the Submit...
          if (date) {
            setErrorModal(true);
            return;
          }

          const updatedFormData = await updateFormData(formSpec.start);
          const storedData = await getSpecificDataFromForage("required_data");

          const res = await saveFormSubmission({
            schedule_id: scheduleId.current,
            form_data: updatedFormData,
            assessment_type: "assessor",
            form_name: formSpec.start,
            submission_status: saveFlag === "draft" ? false : true,
            assessor_id: storedData?.assessor_user_id,
            applicant_id: storedData?.institute_id,
            submitted_on: new Date().toJSON().slice(0, 10),
            applicant_form_id: getCookie("courses_data")[formName],
            round: getCookie("parent_form_round"),
            form_status: saveFlag === "draft" ? "" : "In Progress",
          });

          await getFormStatus();

          // Delete the data from the Local Forage
          const key = `${storedData?.assessor_user_id}_${formSpec.start}_${
            new Date().toISOString().split("T")[0]
          }`;
          removeItemFromLocalForage(key);
          setTimeout(() => navigate(`${ROUTE_MAP.thank_you}${formName}`), 2000);
        }
      }

      if (nextForm?.type === "form") {
        setFormId(nextForm.id);
        setOnFormSuccessData(onSuccessData);
        setOnFormFailureData(onFailureData);
        setEncodedFormSpec(encodeURI(JSON.stringify(formSpec.forms[formId])));
        setEncodedFormURI(
          getFormURI(
            nextForm.id,
            onSuccessData,
            formSpec.forms[nextForm.id].prefill
          )
        );
        navigate(
          formName.startsWith("hospital")
            ? ROUTE_MAP.hospital_forms
            : ROUTE_MAP.medical_assessment_options
        );
      } else if (nextForm?.type === "url") {
        window.location.href = nextForm.url;
      }
    } catch (e) {
      console.log(e);
    }
  }

  const handleEventTrigger = async (e) => {
    handleFormEvents(startingForm, afterFormSubmit, e);
  };

  const bindEventListener = () => {
    window.addEventListener("message", handleEventTrigger);
  };

  const detachEventBinding = () => {
    window.removeEventListener("message", handleEventTrigger);
  };

  const checkIframeLoaded = () => {
    if (window.location.host.includes("localhost")) {
      return;
    }

    const iframeElem = document.getElementById("enketo-form");
    var iframeContent =
      iframeElem?.contentDocument || iframeElem?.contentWindow.document;
    if (date) {
      var section = iframeContent?.getElementsByClassName("or-group");
      if (!section) return;
      for (var i = 0; i < section?.length; i++) {
        var inputElements = section[i].querySelectorAll("input");
        inputElements.forEach((input) => {
          input.disabled = true;
        });
      }

      iframeContent.getElementById("submit-form").style.display = "none";
      iframeContent.getElementById("save-draft").style.display = "none";
    }

    var draftButton = iframeContent.getElementById("save-draft");
    draftButton?.addEventListener("click", function () {
      alert("Hello world!");
    });
  };

  const handleRenderPreview = () => {
    setPreviewModal(true);
    previewFlag = true;
    setTimeout(() => {
      const iframeElem = document.getElementById("preview-enketo-form");
      if (window.location.host.includes("localhost")) {
        return;
      }
      let iframeContent =
        iframeElem?.contentDocument || iframeElem?.contentWindow.document;
      if (!iframeContent) return;
      let section = iframeContent?.getElementsByClassName("or-group");
      if (!section) return;
      for (var i = 0; i < section?.length; i++) {
        var inputElements = section[i].querySelectorAll("input");
        inputElements.forEach((input) => {
          input.disabled = true;
        });
      }
      iframeContent.getElementById("save-draft").style.display = "none";
    }, 1500);
  };

  useEffect(() => {
    bindEventListener();
    getFormData({
      loading,
      scheduleId,
      formSpec,
      startingForm,
      formId,
      setData,
      setEncodedFormSpec,
      setEncodedFormURI,
    });

    setTimeout(() => {
      checkIframeLoaded();
    }, 2500);

    return () => {
      detachEventBinding();
      setData(null);
      setPrefilledFormData(null);
    };
  }, []);

  useEffect(() => {
    getFormData({
      loading,
      scheduleId,
      formSpec,
      startingForm,
      formId,
      setData,
      setEncodedFormSpec,
      setEncodedFormURI,
      isPreview,
    });
  }, [isPreview]);

  return (
    <>
      <CommonLayout
        {...props.commonLayoutProps}
        formUrl={`${ENKETO_URL}/preview?formSpec=${encodedFormSpec}&xform=${encodedFormURI}&userId=${user.user.id}`}
        formPreview={true}
        setIsPreview={setIsPreview}
      >
        {!isPreview && (
          <div className="flex flex-col items-center">
            {encodedFormURI && assData && (
              <>
                <iframe
                  title="form"
                  id="enketo-form"
                  src={`${ENKETO_URL}/preview?formSpec=${encodedFormSpec}&xform=${encodedFormURI}&userId=${user.user.id}`}
                  style={{ height: "80vh", width: "100%" }}
                />
              </>
            )}
          </div>
        )}
      </CommonLayout>

      {errorModal && (
        <CommonModal>
          <div>
            <p className="text-secondary text-2xl lg:text-3xl text-semibold font-medium text-center">
              Error!
            </p>
            <div className="flex flex-row justify-center w-full py-4 text-center">
              You can't submit a Preview form.
            </div>
            <div className="flex flex-row justify-center w-full py-4">
              <div
                className="border border-primary bg-primary text-white py-1 px-7 cursor-pointer lg:px-16 lg:py-3 lg:text-xl"
                onClick={() => setErrorModal(false)}
              >
                Close
              </div>
            </div>
          </div>
        </CommonModal>
      )}

      {previewModal && (
        <CommonModal
          moreStyles={{
            padding: "1rem",
            maxWidth: "95%",
            minWidth: "90%",
            maxHeight: "90%",
          }}
        >
          <div className="flex flex-row w-full items-center cursor-pointer gap-4">
            <div className="flex flex-grow font-bold text-xl">
              Preview and Submit form
            </div>
            <div className="flex flex-grow justify-end">
              <FontAwesomeIcon
                icon={faXmark}
                className="text-2xl lg:text-4xl"
                onClick={() => {
                  setPreviewModal(false);
                  previewFlag = false;
                }}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center w-full py-4">
            <iframe
              title="form"
              id="preview-enketo-form"
              src={`${ENKETO_URL}/preview?formSpec=${encodedFormSpec}&xform=${encodedFormURI}&userId=${user.user.id}`}
              style={{ height: "80vh", width: "100%" }}
            />
          </div>
        </CommonModal>
      )}
    </>
  );
};

export default GenericOdkForm;
