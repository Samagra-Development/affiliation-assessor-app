import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GrDocumentPdf } from "react-icons/gr";
import { AiOutlineClose } from "react-icons/ai";
import { ContextAPI } from "../../utils/ContextAPI";

import Calendar from "react-calendar";
import Select from "react-select";
import ADMIN_ROUTE_MAP from "../../routes/adminRouteMap";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";

import { Label, Button } from "../../components";
import {
  formatDate,
  getInitials,
  readableDate,
  getLocalTimeInISOFormat,
  getCookie,
} from "../../utils/common";
import {
  getUsersForScheduling,
  getScheduleAssessment,
  addInstituteCourse,
  registerEvent,
  updateFormStatus,
  getApplicantDeviceId,
  sendPushNotification,
  sendEmailNotification,
  getAllRegulatorDeviceId,
  getAssessorFormData
} from "../../api";

function ScheduleInspectionModal({ closeSchedule, otherInfo }) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [isLastStep, setIsLastStep] = React.useState(false);
  const [isFirstStep, setIsFirstStep] = React.useState(false);
  const { setSpinner, setToast } = useContext(ContextAPI);
  const { formId } = useParams();
  const navigate = useNavigate();
  const userDetails = getCookie("userData");

  // Common state variables...
  let selectInputRef = useRef();
  let selectAARef = useRef();
  const [payload, setPayload] = useState({});

  // Section 1, where active === 0
  const [OGAObject, setOGAObject] = useState({});
  const [selectedOGA, setSelectedOGA] = useState({});
  let [assistingAssessorList, setAssistingAssessorList] = useState([{}]);
  const [AAObject, setAAObject] = useState([]);
  const [selectedAA, setSelectedAA] = useState([]);
  const [assessorList, setAssessorList] = useState([]);

  // Section 2, where active === 1
  const [formList, setFormList] = useState([]);
  const [selectedFormList, setSelectedFormList] = useState([]);

  useEffect(() => {
    if (otherInfo?.form_name?.includes("applicant")) {
      otherInfo.form_name = `${otherInfo?.form_name?.replace("applicant", "on-ground_assessor")}.xml`;
    }
    console.log("otherInfo =>", otherInfo);
    if(otherInfo !== undefined) {
      getAssessorForms();
    }
    handleOnChangeDate(new Date());
  }, []);

  const handleOnChangeDate = async (date) => {
    let tempDate = formatDate(date);

    setPayload((prevState) => ({ ...prevState, date: tempDate }));
    const postData = { todayDate: tempDate };
    try {
      setSpinner(true);
      const res = await getUsersForScheduling(postData);
      setAssessorList(
        res?.data?.assessors.map((item) => ({
          value: item.code,
          label: item.name,
          phonenumber: item.phonenumber,
          other: item,
        }))
      );
    } catch (error) {
      console.log(error);
    } finally {
      setSpinner(false);
    }
  };

  const handleSelectOGA = (e) => {
    setOGAObject(e);
  };

  const handleAssignOGA = () => {
    setSelectedOGA(OGAObject);
    setAssistingAssessorList(
      assessorList.filter((el) => {
        return el?.phonenumber !== OGAObject?.phonenumber;
      })
    );
  };

  const handleClearOGA = () => {
    setSelectedOGA({});
    setOGAObject({});
    selectInputRef.clearValue();
  };

  const handleSelectAA = (e) => {
    setAAObject(e);
  };

  // aa - Assisting assessor
  const handleClearAA = (aaObj) => {
    const newAA = selectedAA.filter(
      (obj) => obj.phonenumber !== aaObj.phonenumber
    );
    selectAARef.setValue(newAA);
    setSelectedAA(newAA);
  };

  const handleAddAA = () => {
    setSelectedAA(AAObject);
  };

  const getAssessorForms = async () => {
    let payload = {
      title: otherInfo?.course_name,
      assignee: "on-ground_assessor",
      file_name: otherInfo.form_name
    };
    try {
      setSpinner(true);
      const res = await getAssessorFormData(payload);
      setSelectedFormList(
        res?.data?.forms?.map((item) => ({
          value: item.courses[0].course_name,
          label: item.courses[0].course_name,
          level: item.courses[0].course_level,
          formObj: item.courses[0].formObject,
          course_id: item.courses[0].course_id,
        }))
      );
    } catch (error) {
      console.log(error);
    } finally {
      setSpinner(false);
    }
  };

  console.log(formList);

  const handleScheduleAssessment = async () => {
    let coursesObj = selectedFormList.map((obj) => {
      let institute_form = {};
      institute_form.course_id = obj.course_id;
      institute_form.applicant_form_id = +formId;
      institute_form.institute_id = otherInfo?.instituteId;
      institute_form.assessment_date = payload?.date;
      return institute_form;
    });

    const postData = {
      institute_course: [
        {
          institute_id: otherInfo?.instituteId,
          institute_type: JSON.stringify([
            {
              courseType: otherInfo?.course_type,
              courseLevel: otherInfo.course_level,
            },
          ]),
        },
      ],
      institute_form: coursesObj,
    };

    const formData = {
      assessment_schedule: [
        {
          assessor_code: OGAObject.other.code,
          date: payload?.date,
          institute_id: otherInfo?.instituteId,
          assisstant_code: selectedAA?.[0]?.other?.code,
          applicant_form_id: +formId,
        },
      ],
    };

    try {
      setSpinner(true);
      const res = await getScheduleAssessment(formData);
      const addCourse = await addInstituteCourse(postData);
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Inspection scheduled successfully!",
        toastType: "success",
      }));
      closeSchedule(false);

      registerEvent({
        created_date: getLocalTimeInISOFormat(),
        entity_id: otherInfo?.formId,
        entity_type: "form",
        event_name: "Inspection Scheduled",
        remarks: `Round ${otherInfo?.round} inspection scheduled`,
      });

      updateFormStatus({
        form_id: otherInfo?.formId * 1,
        form_status: "Inspection Scheduled",
      });

      const applicantRes = await getApplicantDeviceId({
        institute_id: otherInfo?.instituteId,
      });
      if (getCookie("firebase_client_token") !== undefined) {
        //applicant push notification
        if (applicantRes?.data) {
          let tempIds = JSON.parse(
            applicantRes?.data?.institutes[0]?.institute_pocs[0]?.device_id
          );
          let tempIdsFilter = tempIds.filter(function (el) {
            return el != null;
          });
          if (tempIdsFilter.length) {
            sendPushNotification({
              title: `On-Ground Schedule Information(round ${otherInfo?.round})`,
              body: `The on-ground assessment for Round ${otherInfo?.round}  has been scheduled. On Ground Assessor will visit your college soon.`,
              deviceToken: tempIdsFilter,
              userId:
                applicantRes?.data?.institutes[0]?.institute_pocs[0]?.user_id,
            });
          }
        }

        //regulator push notification
        const regAPIRes = await getAllRegulatorDeviceId();
        let regDeviceIds = [];
        regAPIRes?.data?.regulator?.forEach((item) => {
          let tempIds = JSON.parse(item.device_id);
          let tempIdsFilter = tempIds.filter(function (el) {
            return el != null;
          });
          if (tempIdsFilter.length) {
            regDeviceIds.push({
              user_id: item.user_id,
              device_id: tempIdsFilter[0],
            });
          }
        });

        console.log("regulator device ids-", regDeviceIds);
        if (regDeviceIds.length) {
          regDeviceIds.forEach((regulator) =>
            sendPushNotification({
              title: `On-Ground Schedule Information(round ${otherInfo?.round})`,
              body: `On-ground assessment for ${otherInfo?.instituteName}'s application have been scheduled for Round ${otherInfo?.round}.`,
              deviceToken: [regulator.device_id],
              userId: regulator.user_id,
            })
          );
        }
      }
      //email notify
      if (applicantRes?.data?.institutes[0]?.email) {
        const emailData = {
          recipientEmail: [`${applicantRes?.data?.institutes[0]?.email}`],
          emailSubject: `Inspection scheduled for ${applicantRes?.data?.institutes[0]?.name}`,
          emailBody: `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Your Email Title</title><link href='https://fonts.googleapis.com/css2?family=Mulish:wght@400;600&display=swap' rel='stylesheet'></head><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;'><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 20px; text-align: center; background-color: #F5F5F5;'><img src='https://regulator.upsmfac.org/images/upsmf.png' alt='Logo' style='max-width: 360px;'></td></tr></table><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 36px;'><p style='color: #555555; font-size: 18px; font-family: 'Mulish', Arial, sans-serif;'>Dear ${applicantRes?.data?.institutes[0]?.name},</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>We hope this email finds you well. We are glad to inform you that your application has been processed and was found fit for our next step which is on-ground assessment. On-ground assessment for your application have been scheduled. Please expect us to visit your institute very soon.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Following information will help you prepare for the scheduled on-ground assessment:
      <br/>1. A team of assessors will visit your institute for on-ground assessment. To make this process fair and transparent, institutes are not supposed to know the date of on-ground assessment and assessors are not supposed to know the institute they will be assessing till the day of assessment.
      <br/>2. We expect your institute open and accessible to our on-ground assessment team on any working day.
      <br/>3. Once on-ground assessment team prove their identity, they should be allowed to enter the institute and given full cooperation to carry out the on-ground assessment.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>If you have any questions or need further clarification regarding the resubmission process, please do not hesitate to reach out to our support executives at <Contact Details>. We are here to assist you and provide any necessary guidance.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Thank you for your time and continued interest in getting affiliated from our organization.</p></td></tr></table></body></html>`,
        };

        sendEmailNotification(emailData);
      }

      setTimeout(
        () => navigate(`${ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home}`),
        500
      );
    } catch (error) {
      let date = new Date(formData.assessment_schedule.date);
      if (error?.response?.data.code === "constraint-violation") {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg:
            "Inspection already scheduled for " + date.toDateString() + ".",
          toastType: "error",
        }));
      } else {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "Error occurred while scheduling inspection!",
          toastType: "error",
        }));
      }
    } finally {
      setSpinner(false);
    }
  };

  return (
    <>
      <div className="flex flex-col justify-center items-center fixed inset-0 bg-opacity-24 z-10 backdrop-blur-sm">
        <div className="flex bg-white rounded-xl shadow-xl border border-gray-400 w-[900px] h-fit">
          <div className="flex flex-col w-full">
            <div className="flex flex-col p-4 border-t-gray-300 border-2 rounded-b-xl">
              <section>
                {activeStep === 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex text-xl font-semibold">
                      Schedule the inspection
                    </div>
                    <div className="flex flex-row gap-4">
                      <div className="flex flex-col gap-3 border-gray-400 border-[1px] rounded-md p-4">
                        <div className="flex flex-row gap-2 items-center">
                          <div className="flex justify-center items-center w-[28px] h-[28px] rounded-full bg-gray-300 border-1 border-gray-400 text-bold text-primary-500">
                            1
                          </div>
                          <Label
                            text="Select a date to select an assessor"
                            moreClass="text-[16px]"
                            required
                          ></Label>
                        </div>
                        <div className="no-absolute">
                          <Calendar
                            className="bg-blue-400 rounded-[8px]"
                            onChange={handleOnChangeDate}
                            minDate={new Date()}
                          />
                        </div>
                        <div className="font-medium">
                          Selected date : {readableDate(payload.date)}
                        </div>
                      </div>
                      <div className="flex flex-grow flex-col gap-4">
                        <div className="flex flex-col gap-3 flex-grow p-4 border-gray-400 border-[1px] rounded-md">
                          <div className="flex flex-row gap-2 items-center">
                            <div className="flex justify-center items-center w-[28px] h-[28px] rounded-full bg-gray-300 border-1 border-gray-400 text-bold text-primary-500">
                              2
                            </div>
                            <div className="font-medium">
                              <Label
                                text="Add on ground assessor"
                                moreClass="text-[16px]"
                                required
                              ></Label>
                            </div>
                          </div>
                          <div className="flex flex-row gap-3">
                            <Select
                              name="assessor_name"
                              label="Assessor Name"
                              onChange={handleSelectOGA}
                              options={assessorList}
                              ref={(ref) => {
                                selectInputRef = ref;
                              }}
                              isDisabled={selectedOGA.label ? true : false}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            ></Select>
                            <Button
                              onClick={() => handleAssignOGA()}
                              moreClass={`${
                                !selectedOGA?.label
                                  ? "border border-blue-400 bg-white text-blue-400 px-8 h-[44px]"
                                  : "cursor-not-allowed border border-gray-500 bg-white text-gray-500 px-8 h-[44px]"
                              }`}
                              text="Add"
                            ></Button>
                          </div>

                          {selectedOGA?.label && (
                            <>
                              <div className="bg-gray-100 items-center flex border border-gray-100 justify-between rounded-xl p-1">
                                <div className="gap-2 flex items-center">
                                  <span className="border-green-500 w-[36px] h-fit items-center bg-green-500 inline-flex justify-center gap-x-1.5 rounded-md px-2 py-2 text-sm font-semibold text-white-500 shadow-sm">
                                    {getInitials(selectedOGA?.label)}
                                  </span>
                                  <span className="font-semibold">
                                    {selectedOGA?.label}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleClearOGA()}
                                  className="justify-end flex"
                                >
                                  <AiOutlineClose />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col flex-grow gap-3 p-4 border-gray-400 border-[1px] rounded-md">
                          <div className="flex flex-row gap-2 items-center">
                            <div className="flex justify-center items-center w-[28px] h-[28px] rounded-full bg-gray-300 border-1 border-gray-400 text-bold text-primary-500">
                              3
                            </div>
                            <div className="flex flex-row gap-1 items-center">
                              <Label
                                text="Add an assisting assessor"
                                moreClass="text-[16px] font-medium"
                              ></Label>

                              <span className="text-[11px]">
                                (only one member allowed)
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-row gap-3">
                            <Select
                              isMulti
                              isOptionDisabled={() => AAObject.length >= 1}
                              name="assisting_assessor"
                              label="Assisting Assessor/s"
                              ref={(ref) => {
                                selectAARef = ref;
                              }}
                              onChange={handleSelectAA}
                              options={assistingAssessorList}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            />

                            <Button
                              onClick={() => handleAddAA()}
                              moreClass={`border border-blue-400 bg-white text-blue-400 px-8 h-[44px]`}
                              text="Add"
                            ></Button>
                          </div>

                          <div className="flex flex-col gap-3 max-h-[120px] overflow-auto">
                            {selectedAA.map((aa) => {
                              return (
                                <div
                                  className="bg-gray-100 items-center flex border border-gray-100 justify-between rounded-xl p-1"
                                  key={aa.phonenumber}
                                >
                                  <div className="gap-2 flex items-center">
                                    <span
                                      className="border-green-500 w-[36px] h-3/4 items-center bg-green-500 inline-flex justify-center gap-x-1.5 
                                    ed-md px-2 py-2 text-sm font-semibold text-white-500 shadow-sm"
                                    >
                                      {getInitials(aa.label)}
                                    </span>
                                    <span className="font-semibold">
                                      {aa.label}
                                    </span>
                                  </div>
                                  <button
                                    className="justify-end flex"
                                    onClick={() => {
                                      handleClearAA(aa);
                                    }}
                                  >
                                    <AiOutlineClose />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                      </div>
                    
                    </div>
                      {/* choose form */}
                      <div className="flex flex-col gap-2">
                    <div className="flex text-lg font-semibold">
                            Available Assessor Form
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col gap-3 rounded-xl border border-gray-400 p-2">
                        <div className="flex flex-col gap-3 max-h-[120px] overflow-auto">
                          {selectedFormList.length > 0 ? <>
                          {selectedFormList.map((form, index) => 
                            (
                              <div
                                className="flex items-center bg-gray-100 border border-gray-100 rounded-md font-semibold"
                              >
                                <div className="flex w-[36px] h-[36px] items-center justify-center">
                                  <GrDocumentPdf />
                                </div>
                                <div>{form.label}</div>
                              </div>
                            )
                          )}</>: <p style={{color: 'red'}}>No assessor forms available for the current applicant form. Please create a form to schedule inspection</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </section>

              <footer className="mt-4">
                {activeStep === 0 && (
                  <div className="flex flex-row justify-between w-full">
                    <Button
                      onClick={() => {
                        closeSchedule(false);
                      }}
                      moreClass={`px-8 border border-primary-500 bg-white text-primary-500`}
                      text="Close"
                    ></Button>
                      <Button
                      onClick={handleScheduleAssessment}
                      otherProps={{
                        disabled:
                          selectedOGA?.value && selectedFormList[0]?.value
                            ? false
                            : true,
                      }}
                      moreClass={`${
                        selectedOGA?.value && selectedFormList[0]?.value
                          ? "px-8 text-white"
                          : "cursor-not-allowed border border-gray-500 bg-white text-gray-500 px-8 h-[44px]"
                      }`}
                      text="Submit"
                    ></Button>
                  </div>
                )}
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ScheduleInspectionModal;
