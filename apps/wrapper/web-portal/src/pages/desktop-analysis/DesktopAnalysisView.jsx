import React, { useContext, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { FaAngleRight } from "react-icons/fa";
import StatusLogModal from "../ground-analysis/StatusLogModal";
import XMLParser from "react-xml-parser";
import { getCookie, readableDate, setCookie } from "../../utils";

// import NocModal from "./NocModal";
import { getLocalTimeInISOFormat } from "../../utils";
import { Card, Button } from "./../../components";
import CommonModal from "./../../Modal";
import ScheduleInspectionModal from "./ScheduleInspectionModal";
import {  Tooltip } from "@material-tailwind/react";
import {
  getFormData,
  registerEvent,
  getStatus,
  updateFormStatus,
  updatePaymentStatus,
  sendPushNotification,
  getAllRegulatorDeviceId,
  getApplicantDeviceId,
  sendEmailNotification,
  base64ToPdf
} from "../../api";
import ADMIN_ROUTE_MAP from "../../routes/adminRouteMap";
import {
  getFormURI,
  updateFormSubmission,
  getPrefillXML,
} from "./../../api/formApi";
import {
  updateFormData,
  removeItemFromLocalForage,
  getFromLocalForage,
  setToLocalForage,
  removeAllFromLocalForage,
} from "../../forms";
import { ContextAPI } from "../../utils/ContextAPI";
import { StrictMode } from "react";
import ReturnToInstituteModal from "./ReturnToInstituteModal";


import CommentsModal from "../../components/CommentsModal";

import {
  FaFileDownload,
} from "react-icons/fa";

const ENKETO_URL = process.env.REACT_APP_ENKETO_URL;
let isFormSubmittedForConfiirmation = false;


export default function DesktopAnalysisView() {
  const [returnToInstituteModal, setReturnToInstituteModal] = useState(false);
  // const [openModel, setOpenModel] = useState(false);
  const navigate = useNavigate();
  const [openScheduleInspectionModel, setOpenSheduleInspectionModel] =
    useState(false);
  const [encodedFormURI, setEncodedFormURI] = useState("");
  let { formName, formId } = useParams();
  const [formDataFromApi, setFormDataFromApi] = useState();
  const [openStatusModel, setOpenStatusModel] = useState(false);
  const { setSpinner, setToast } = useContext(ContextAPI);
  const [onFormSuccessData, setOnFormSuccessData] = useState(undefined);
  const [onFormFailureData, setOnFormFailureData] = useState(undefined);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [onSubmit, setOnSubmit] = useState(false);
  const [rejectStatus, setRejectStatus] = useState(false);
  const [formLoaded, setFormLoaded] = useState(false);
  let [isDownloading, setIsDownloading] = useState(false);
  
  
  const [showAlert, setShowAlert] = useState(false);
  const [state, setState] = useState({
    alertContent: {
      alertTitle: "",
      alertMsg: "",
      actionButtonLabel: "",
    },
  });

  const loggedInUserRole = getCookie("userData").attributes.Role[0];

  const formSpec = {
    skipOnSuccessMessage: true,
    prefill: {},
    submissionURL: "",
    name: formName,
    successCheck: "async (formData) => { return true; }",
    onSuccess: {
      notificationMessage: "Feedback submitted successfully",
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
    start: formName,
  };

  const startingForm = formSpec.start;
  const [encodedFormSpec, setEncodedFormSpec] = useState(
    encodeURI(JSON.stringify(formSpec.formId))
  );

  const userDetails = getCookie("userData");
  const userId = userDetails?.id;

  const fetchFormData = async () => {
    let formData = {};
    let filePath =
      process.env.REACT_APP_GCP_AFFILIATION_LINK + formName + ".xml";

    let data = await getFromLocalForage(
      `${userId}_${formName}_${new Date().toISOString().split("T")[0]}`
    );

    const postData = { form_id: formId };
    try {
      const res = await getFormData(postData);
      formData = res.data.form_submissions[0];
      //formData = formData.reverted_count = 2; //revertedCount
      console.log(formData)
      setPaymentStatus(formData?.payment_status);
      const postDataEvents = { id: formId };
      const events = await getStatus(postDataEvents);
      setFormStatus(events?.events);
      setFormDataFromApi(res.data.form_submissions[0]);
      await setToLocalForage(
        `${userId}_${startingForm}_${new Date().toISOString().split("T")[0]}`,
        {
          formData: formData?.form_data,
          imageUrls: { ...data?.imageUrls },
        }
      );

      let formURI = await getPrefillXML(
        `${filePath}`,
        formSpec.onSuccess,
        formData?.form_data,
        formData?.imageUrls
      );
      setEncodedFormURI(formURI);
    } catch (error) {
      console.log(error);
    } finally {
      setSpinner(false);
    }
  };

  const afterFormSubmit = async (e) => {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    try {
      const { nextForm, formData, onSuccessData, onFailureData } = data;
      if (data?.state === "ON_FORM_SUCCESS_COMPLETED") {
        isFormSubmittedForConfiirmation = true;
        setOnSubmit(true);
      }

      if (nextForm?.type === "form") {
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
      } else if (nextForm?.type === "url") {
        window.location.href = nextForm.url;
      }
    } catch (e) {
      console.log("error = ", e);
    }
  };

  const handleSubmit = async () => {
  try {
     console.log(formDataFromApi)
     let formSubmissionStatus = "Returned";
     if( formDataFromApi?.reverted_count >= 2){
       formSubmissionStatus = "Rejected";
     }
    console.log(formSubmissionStatus)
    //return
    const updatedFormData = await updateFormData(formSpec.start, userId);

    const res = await updateFormSubmission({
      form_id: formId,
      form_data: updatedFormData,
      assessment_type: "applicant",
      form_name: formName?.replace("admin", "applicant"),
      submission_status: true,
      course_type: formDataFromApi?.course_type,
      course_level: formDataFromApi?.course_level,
      course_id: formDataFromApi?.course_id,
      round:formDataFromApi?.round,
      applicant_id: formDataFromApi?.institute?.id,
      updated_at: getLocalTimeInISOFormat(),
      reverted_count: formDataFromApi?.reverted_count + 1,
      form_status: formSubmissionStatus // "Returned",
    });

    if (res) {
      // Register Event of the form.
      await registerEvent({
        created_date: getLocalTimeInISOFormat(),
        entity_id: formId.toString(),
        entity_type: "form",
        event_name: formSubmissionStatus, // "Returned",
        remarks: `${userDetails?.username} has ${formSubmissionStatus} application with remarks`,
      });

      //notifications
      const applicantRes = await getApplicantDeviceId({
        institute_id: formDataFromApi?.institute?.id,
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
              title: `Updates or Changes Requested by Admin`,
              body: `There are some clarifications requested to your application. Kindly log in to your application form to review and make the necessary adjustments.`,
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
              title: `Application ${formSubmissionStatus}!`,
              body: `Application ${formSubmissionStatus} for ${applicantRes?.data?.institutes[0]?.name} with remarks.`,
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
          emailSubject: `Application ${formSubmissionStatus}!`,
          emailBody: `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Your Email Title</title><link href='https://fonts.googleapis.com/css2?family=Mulish:wght@400;600&display=swap' rel='stylesheet'></head><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;'><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 20px; text-align: center; background-color: #F5F5F5;'><img src='https://regulator.upsmfac.org/images/upsmf.png' alt='Logo' style='max-width: 360px;'></td></tr></table><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 36px;'><p style='color: #555555; font-size: 18px; font-family: 'Mulish', Arial, sans-serif;'>Dear ${applicantRes?.data?.institutes[0]?.name},</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>We hope this email finds you well. We are writing to kindly request the resubmission of your application for the affiliation process. We apologize for any inconvenience caused, but it appears that there was an issue with the initial submission, and we did not receive the full information for proceeding to next steps.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>We kindly request that you resubmit your application using the following steps:
            <p>1. Please find your ${formSubmissionStatus} application in the application inbox.</p>
            <p>2. You can open the ${formSubmissionStatus} application to view the returning officer's comment. The comments will help you to understand the gaps and bridge them.</p>
            <p>3. You can resubmit the ${formSubmissionStatus} application after you are done with making the required changes. Please ensure to keep saving the application as draft while you progress.</p></p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>We understand that this may require some additional effort on your part, and we sincerely appreciate your cooperation. Rest assured that we will treat your resubmitted application with the utmost attention and consideration during our evaluation process.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>If you have any questions or need further clarification regarding the resubmission process, please do not hesitate to reach out to our support executives at <Contact Details>. We are here to assist you and provide any necessary guidance.</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'></p>Please note that the deadline for resubmitting your application is <deadline date>. Applications received after this date may not be considered for the current affiliation process.<p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'></p>We look forward to receiving your updated application.<p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Thank you for your time and continued interest in getting affiliated from our organization.</p></td></tr></table></body></html>`,
        };

        // sendEmailNotification(emailData);
      }
    }
    isFormSubmittedForConfiirmation = false;
    setOnSubmit(false);

    // Delete the data from the Local Forage
    const key = `${userId}_${formSpec.start}_${
      new Date().toISOString().split("T")[0]
    }`;
    removeItemFromLocalForage(key);

    // setOnSubmit(false);
    setToast((prevState) => ({
      ...prevState,
      toastOpen: true,
      toastMsg: `Form ${formSubmissionStatus} successfully!`,
      toastType: `success`
    }));

    setSpinner(false);
    setTimeout(
      () => navigate(`${ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home}`),
      1500
    );
  
  } catch (error) {
    setSpinner(false);
    setToast((prevState) => ({
      ...prevState,
      toastOpen: true,
      toastMsg: `Something went wrong. Please try again later`,
      toastType: `error`
    }));
  }
  }
 

  const handleFormEvents = async (startingForm, afterFormSubmit, e) => {
    if(typeof e?.data === 'string' && e?.data.includes('comment-click')) {
      console.log("Hiee");
      return;
    } 
    if(typeof e?.data === 'string' && e?.data.includes('formLoad')) {
      setFormLoaded(true);
      return;
    }
    if (typeof e?.data === "string" && e?.data.includes("webpackHot")) {
      return;
    }

    if (e.data &&
      ENKETO_URL === e.origin + "/enketo" &&
      typeof e?.data === "string" &&
      JSON.parse(e?.data)?.state !== "ON_FORM_SUCCESS_COMPLETED" &&
      !isFormSubmittedForConfiirmation
    ) {
      var formData = new XMLParser().parseFromString(
        JSON.parse(e.data).formData
      );
      if (formData) {
        let images = JSON.parse(e.data).fileURLs;
        let prevData = await getFromLocalForage(
          `${userId}_${startingForm}_${new Date().toISOString().split("T")[0]}`
        );

        await setToLocalForage(
          `${userId}_${startingForm}_${new Date().toISOString().split("T")[0]}`,
          {
            formData: JSON.parse(e.data).formData,
            // imageUrls: { ...prevData?.imageUrls, ...images },
          }
        );
      }
    }
    afterFormSubmit(e);
  };

  const handleEventTrigger = async (e) => {
   // console.log(e)
    //setShowAlert(true);
    setState((prevState) => ({
      ...prevState,
      alertContent: {
        quesContent: "Is your institute's Principal graduate?",
        alertMsg: "Are you sure to publish the form ? ",
        actionButtonLabel: "Save",
        actionProps: [e],
      },
    }));

    handleFormEvents(startingForm, afterFormSubmit, e);
  };

  const bindEventListener = () => {
    window.addEventListener("message", handleEventTrigger);
  
  };
  const otherInfo = {
    form_name: formDataFromApi?.form_name,
    instituteId: formDataFromApi?.institute?.id,
    instituteName: formDataFromApi?.institute?.name,
    course_applied: formDataFromApi?.institute?.course_applied,
    formId: formId,
    course_type: formDataFromApi?.course_type,
    course_level: formDataFromApi?.course_level,
    course_name: formDataFromApi?.course?.course_name,
    round: formDataFromApi?.round,
  };

  const desktopVerification = async () => {

    try { 
     await updatePaymentStatus({ form_id: formId, payment_status: "Pending" });
      registerEvent({
        created_date: getLocalTimeInISOFormat(),
        entity_id: formId,
        entity_type: "form",
        event_name: "DA Completed",
        remarks: `${
          getCookie("regulator")[0]["full_name"]
        } has completed the Desktop Analysis`,
      });
  
      await updateFormStatus({
        form_id: formId * 1,
        form_status: "DA Completed",
        updated_at: getLocalTimeInISOFormat()
      });/* .then((res) => {
        if(res.status === 200){
          setToast((prevState) => ({
            ...prevState,
            toastOpen: true,
            toastMsg: "Form approved successfully",
            toastType: "success",
          }));
        }
      }); */
      if (getCookie("firebase_client_token") !== undefined) {
        // regulator
        const regAPIRes = await getAllRegulatorDeviceId();
        let regDeviceIds = [];
        regAPIRes?.data?.regulator?.forEach((item) => {
          const tempIds = JSON.parse(item.device_id);
          const tempIdsFilter = tempIds.filter(function (el) {
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
              title: "Desktop Analysis Done",
              body: `The desktop analysis for ${formDataFromApi?.institute?.name}'s application has been completed. Kindly review the results.`,
              // deviceToken: [`${getCookie("firebase_client_token")}`],
              deviceToken: [regulator.device_id],
              userId: regulator.user_id,
            })
          );
        }
  
        // applicant
        const applicantRes = await getApplicantDeviceId({
          institute_id: formDataFromApi?.institute?.id,
        });
        if (applicantRes?.data) {
          let tempIds = JSON.parse(
            applicantRes?.data?.institutes[0]?.institute_pocs[0]?.device_id
          );
          let tempIdsFilter = tempIds.filter(function (el) {
            return el != null;
          });
          if (tempIdsFilter.length) {
            sendPushNotification({
              title: "Application Review",
              body: `Your application is reviewed by the UPSMF representative. Kindly make the payment for further process.`,
              deviceToken: tempIdsFilter,
              userId:
                applicantRes?.data?.institutes[0]?.institute_pocs[0]?.user_id,
            });
          }
        }
      }
  
      setTimeout(
        () => navigate(`${ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home}`),
        1500
      );
  /*     setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Form approved successfully.",
        toastType: "success",
      })); */
    } catch (error) {
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong. Please try again later.",
        toastType: "error",
      }));
    }

  
  };

  const addAlert = (e) => {
   const element = e.target;
   let object = {};
   let answers = [];
   let closestParent = element?.closest('.question');
   if(closestParent !== null) {
    let spanElement = closestParent?.children[0];
    if(spanElement!== undefined) {
      let value = spanElement.innerText;
      console.log("value =>", value);
      let childrenElem = closestParent?.children;
      object['question'] = spanElement.innerText;
      if(childrenElem?.length > 0) {
      for(let i = 0; i < childrenElem?.length; i++) {
        if(childrenElem[i]?.name !== undefined) {
          if(childrenElem[i]?.name?.toLowerCase().includes('/data/d/')) {
            answers.push(childrenElem[i]?.value);
          }
        }
      }
    }
    console.log("answers =>", answers);
    // let value = spanElement.innerText;
    object['answer'] = answers[0];
    let record = {
            instance: 'comment-click',
            object: object,
    }
    window.parent.postMessage(JSON.stringify({record}), '*');
    }
   }
  }


  const checkIframeLoaded = () => {
    if (window.location.host.includes("regulator.upsmfac")) {
      const iframeElem = document?.getElementById("enketo_DA_preview");
      var iframeContent =
        iframeElem?.contentDocument || iframeElem?.contentWindow.document;
        // append icon element to DOM after iframeload 
        var section = iframeContent?.getElementsByClassName("or-group");
        if (!section) return;
        for (let j = 0; j < section?.length; j++) {
          const labelElements = section[j].getElementsByClassName("question");
          for(let i = 0; i < labelElements.length; i++) {
            let element = document.createElement("i");
            element.setAttribute("class","fa fa-comment");
            element.setAttribute('id', 'comment-section');
            element.addEventListener('click', addAlert);
            labelElements[i].insertBefore(element, labelElements[i].childNodes[2]);
        }
      }
      if (
        formDataFromApi &&
        formDataFromApi?.form_status?.toLowerCase() !==
          "application submitted" &&
        formDataFromApi?.form_status?.toLowerCase() !== "resubmitted"
      ) {
        if (!section) return;
        for (let i = 0; i < section?.length; i++) {
        //   const labelElements = section[i].getElementsByClassName("question");
        //   for(let i = 0; i < labelElements.length; i++) {
        //     let element = document.createElement("i");
        //     element.setAttribute("class","fa fa-comment");
        //     labelElements[i].insertBefore(element, labelElements[i].childNodes[2]);
        // }
          var inputElements = section[i].querySelectorAll("input");
          var buttonElements = section[i].querySelectorAll("button");
          
          buttonElements.forEach((button) => {
            button.disabled = true;
          });
          inputElements.forEach((input) => {
            input.disabled = true;
          });
          /* partial logic to test disabling fields */
        }
        iframeContent.getElementById("submit-form").style.display = "none";
      }
      // manipulate span element text content
      const buttonElement = iframeContent.getElementById('submit-form');
       const spanElement = buttonElement?.children[1];
       spanElement.textContent = 'Return to applicant';

      // Need to work on Save draft...
      iframeContent.getElementById("save-draft").style.display = "none";
      // var draftButton = iframeContent.getElementById("save-draft");
      // draftButton?.addEventListener("click", function () {
      //   alert("Hello world!");
      // });
   
      if(formDataFromApi?.form_status?.toLowerCase() === "resubmitted" && formDataFromApi?.reverted_count >= 2){
        iframeContent.getElementById("submit-form").style.display = "none";
      }
      var optionElements = iframeContent.getElementsByClassName('option-label');
      if (!optionElements) return;
      for(var k = 0; k < optionElements.length; k++ ) {
        optionElements[k].style.color = '#333333';
      } 
    }
    const commentElement = iframeContent.getElementById('comment-section');
    commentElement?.addEventListener('click', function() {
      
    });
    setSpinner(false);
  };

  const handleFormDownload = async () => {
    try {
      setIsDownloading(true);
      const formUrl = `${ENKETO_URL}/preview?formSpec=${encodeURI(
        JSON.stringify(formSpec)
      )}&xform=${encodedFormURI}&userId=${userId}`;
      const res = await base64ToPdf(formUrl);

      const linkSource = `data:application/pdf;base64,${res.data}`;
      const downloadLink = document.createElement("a");
      const fileName = "enketo_form.pdf";
      downloadLink.href = linkSource;
      downloadLink.download = fileName;
      downloadLink.target = window.safari ? "" : "_blank";
      downloadLink.click();
      setIsDownloading(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setSpinner(true);
    fetchFormData();
    bindEventListener();

    // To clean all variables
    return () => {
      window.removeEventListener("message", handleEventTrigger);
    };
  }, []);

  useEffect(() => {
   if(formLoaded === true) {
    checkIframeLoaded();
   }
  }, [formLoaded]);

  return (
    <StrictMode>
       
        {showAlert && (
          <CommentsModal showAlert={setShowAlert} {...state.alertContent} />
        )}
      <div className="h-[48px] bg-white flex justify-start drop-shadow-sm">
        <div className="container mx-auto flex px-3">
          <div className="flex flex-row font-bold gap-2 items-center">
            <Link to={ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home}>
              <span className="text-primary-400">
                Desktop analysis - All applications
              </span>
            </Link>
            <FaAngleRight className="text-[16px]" />
            <span className="text-gray-500 uppercase">
              {formDataFromApi?.course?.course_name.split("_").join(" ")}
            </span>
          </div>
        </div>
      </div>

      <div className={`container m-auto min-h-[calc(100vh-148px)] px-3 py-12`}>
        <div className="flex flex-col gap-12">
          <div className="flex flex-row">
            <div className="flex grow gap-4 justify-end items-center">
              {/* {paymentStatus?.toLowerCase() !== "paid" &&
                formDataFromApi?.form_status !== "Rejected" && (
                  <button
                    onClick={() => setReturnToInstituteModal(true)}
                    disabled={
                      formStatus == "Approved" ||
                      formStatus == "Rejected" ||
                      rejectStatus
                        ? true
                        : false
                    }
                    className={
                      formStatus == "Approved" ||
                      formStatus == "Rejected" ||
                      rejectStatus
                        ? "invisible cursor-not-allowed flex flex-wrap items-center justify-center gap-2 border border-gray-500 text-gray-500 bg-white w-[140px] h-[40px] font-medium rounded-[4px]"
                        : "flex flex-wrap items-center justify-center gap-2 border border-gray-500 bg-white text-gray-500 w-fit h-fit p-2 font-semibold rounded-[4px]"
                    }
                  >
                    <span>
                      <BsArrowLeft />
                    </span>
                    Reject Application
                  </button>
                )} */}
                 
                   {

                formDataFromApi?.reverted_count >= 2 &&
                formDataFromApi?.form_status?.toLowerCase() === "resubmitted" && 
                 formDataFromApi?.form_status?.toLowerCase() !== "rejected" && 
                (
                  <Tooltip arrow content="This form has been resubmitted 3 times. No more reverts possible.">
                  <button 
                    onClick={() => handleSubmit()}
                    className="text-red-500 flex flex-wrap items-center justify-center gap-2 border border-gray-500 bg-white text-gray-500 w-fit h-fit p-2 font-semibold rounded-[4px]"
                  >
                  Reject Application
                  </button>
                  </Tooltip>
                )}
              {paymentStatus?.toLowerCase() === "paid" &&
                formDataFromApi?.form_status?.toLowerCase() ===
                  "da completed" && loggedInUserRole !== "Desktop-Assessor" && (
                  <button
                    onClick={() => setOpenSheduleInspectionModel(true)}
                    className="flex flex-wrap items-center justify-center gap-2 border border-gray-500 bg-white text-gray-500 w-fit h-fit p-2 font-semibold rounded-[4px]"
                  >
                    Send for inspection
                    <span>
                      <BsArrowRight />
                    </span>
                  </button>
                )}
           {/*   { console.log(paymentStatus)} */}
                 {paymentStatus?.toLowerCase() === "initiated" && formDataFromApi?.round === 2 &&
                formDataFromApi?.form_status?.toLowerCase() ===
                  "da completed" && loggedInUserRole !== "Desktop-Assessor" && (
                  <button
                    onClick={() => setOpenSheduleInspectionModel(true)}
                    className="flex flex-wrap items-center justify-center gap-2 border border-gray-500 bg-white text-gray-500 w-fit h-fit p-2 font-semibold rounded-[4px]"
                  >
                    Send for inspection
                    <span>
                      <BsArrowRight />
                    </span>
                  </button>
                )}
              {formDataFromApi?.form_status?.toLowerCase() !== "da completed" &&
                (formDataFromApi?.form_status?.toLowerCase() ===
                  "application submitted" ||
                  formDataFromApi?.form_status?.toLowerCase() ===
                    "resubmitted") && (
                  <button
                    onClick={() => desktopVerification()}
                    className="flex flex-wrap items-center justify-center gap-2 border border-gray-500 bg-white text-gray-500 w-fit h-fit p-2 font-semibold rounded-[4px]"
                  >
                    Approve and Initiate Payment
                  </button>
                )}

              <div
                className={`${
                  formDataFromApi?.form_status === "Inspection Scheduled"
                    ? "invisible"
                    : "inline-block h-[40px] min-h-[1em] w-0.5 border opacity-100 dark:opacity-50"
                }`}
              />
              <button
                onClick={() => setOpenStatusModel(true)}
                className="border border-gray-500 text-blue-600 bg-gray-100 w-[140px] h-[40px] font-medium rounded-[4px]"
              >
                View status log
              </button>
            </div>
          </div>

          <div className="flex flex-row gap-4">
            {/* <div className="flex w-[30%]">
              <Sidebar />
            </div> */}
            <div className="flex w-full flex-col gap-4">
              <Card
                moreClass="flex flex-col shadow-md border border-[#F5F5F5] gap-4"
                styles={{ backgroundColor: "#F5F5F5" }}
              >
                <div
                  className="p-1 flex justify-center border border-[#D9D9D9] rounded-[4px]"
                  style={{ backgroundColor: "#EBEBEB" }}
                >
                  <h4
                    className={`font-medium ${
                      formDataFromApi?.form_status?.toLowerCase() ===
                      "in progress"
                        ? "text-yellow-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "resubmitted"
                        ? "text-orange-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "inspection scheduled"
                        ? "text-blue-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "application submitted"
                        ? "text-green-400"
                        : formDataFromApi?.form_status?.toLowerCase() === "na"
                        ? "text-red-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "oga completed"
                        ? "text-purple-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "approved"
                        ? "text-teal-400"
                        : formDataFromApi?.form_status?.toLowerCase() ===
                          "rejected"
                        ? "text-pink-400"
                        : "text-white"
                    }`}
                  >
                    Status: {formDataFromApi?.form_status}
                  </h4>
                </div>
                <div className="flex text-gray-500 justify-center">
                  This application was last updated on{" "}
                  {readableDate(formStatus?.[0]?.created_date)}
                </div>
              </Card>
              <Card moreClass="shadow-md">
              <div className="flex flex-grow gap-5 my-6 justify-end">
              <button
                className={`bg-primary-900 py-3 font-medium rounded-[4px] px-6 text-white flex flex-row items-center gap-3 ${
                  isDownloading ? "cursor-not-allowed" : ""
                }  `}
                onClick={handleFormDownload}
                disabled={isDownloading}
              >
                <FaFileDownload />
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              </button>
            </div>
                {encodedFormURI!== "" && (<iframe
                  id="enketo_DA_preview"
                  title="form"
                  onLoad={checkIframeLoaded}
                  src={`${ENKETO_URL}/preview?formSpec=${encodeURI(
                    JSON.stringify(formSpec)
                  )}&xform=${encodedFormURI}&userId=${userId}`}
                  style={{ minHeight: "100vh", width: "100%" }}
                />)}
              </Card>
            </div>
          </div>

          {/* { openModel && <NocModal closeModal={setOpenModel}/> } */}
          {returnToInstituteModal && (
            <ReturnToInstituteModal
              closeRejectModal={setReturnToInstituteModal}
              setRejectStatus={setRejectStatus}
              formId={formId}
              instituteId={otherInfo?.instituteId}
              instituteName={otherInfo?.instituteName}
            />
          )}
          {/* {openCertificateModel && <IssueCertificateModal closeCertificateModal={setOpenCertificateModel}/>} */}
          {openStatusModel && (
            <StatusLogModal
              closeStatusModal={setOpenStatusModel}
              formId={formId}
            />
          )}
          {openScheduleInspectionModel && (
            <ScheduleInspectionModal
              closeSchedule={setOpenSheduleInspectionModel}
              otherInfo={otherInfo}
            />
          )}
        </div>
      </div>

      {onSubmit && (
        <CommonModal>
          <p className="text-secondary text-2xl text-semibold font-medium text-center">
            Are you sure, do you want to <span className="text-red-500">return</span>  this application with remarks to the applicant?
          </p>

          <div className="flex flex-row justify-center w-full py-4 gap-5">
            <div
              className="border border-primary bg-primary py-3 px-8 rounded-[4px] cursor-pointer items-center"
              onClick={() => {
                isFormSubmittedForConfiirmation = false;
                setOnSubmit(false);
              }}
            >
              No
            </div>
            <div
              className="bg-primary-900 py-3 rounded-[4px] px-8 text-white items-center gap-3 border border-primary py-3 px-7 cursor-pointer"
              onClick={() => handleSubmit()}
            >
              Yes! Return
            </div>
          </div>
        </CommonModal>
      )}
    </StrictMode>
  );
}
