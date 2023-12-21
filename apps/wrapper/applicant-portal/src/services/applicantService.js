import { APIS } from "../constants";
import axiosService from "./axiosService";
import paymentService from "./paymentService";


let paymentReferenceNo="";

const NOTIFICATION_BASE_URL =
  process.env.REACT_APP_NODE_URL || "https://uphrh.in/api/api/";

const addInstitute = (instituteDetails) => {
  return axiosService.post(APIS.APPLICANT.ADD_INSTITUTE, instituteDetails);
};


const checkIsEmailExist = async (postData) => {
  const res = await axiosService.post(
    APIS.SIGNUP.CHECK_IS_EMAIL_EXIST,
    postData
  );
  return res;
};

const updateParentCode = (instituteDetails) => {
  return axiosService.post(APIS.APPLICANT.UPDATE_PARENT_CODE,instituteDetails)
}

const addInstitutePoc = (institutePocDetails) => {
  return axiosService.post(
    APIS.APPLICANT.ADD_INSTITUTE_POC,
    institutePocDetails
  );
};

const getApplicantDetails = (applicantDetails) => {
  return axiosService.post(
    APIS.APPLICANT.GET_APPLICANT_DETAILS,
    applicantDetails
  );
};

// payment service
const initiatePayment = async (postData) => {
  const res = await paymentService.post(APIS.PAYMENT.GENERATE_LINK, postData);
  return res;
};

const initiatePaymentForNewForm = async (postData) => {
  const res = await paymentService.post(APIS.PAYMENT.GENERATE_LINK_V2, postData);
  return res;
};

const updateApplicantDeviceId = async (postData) => {
  const res = await axiosService.put(
    APIS.COMMON.UPDATE_APPLICANT_DEVICE_ID,
    postData
  );
  return res;
};

// new notification APIs
export const sendPushNotification = async (postData) => {
  const res = await axiosService.post(
    APIS.notifications.sendPushNotification,
    postData
  );
  return res;
};

export const readNotification = async (postData) => {
  const res = await axiosService.post(
    APIS.notifications.readNotification,
    postData
  );
  return res;
};

export const sendEmailNotification = async (postData) => {
  const res = await axiosService.post(APIS.notifications.emailNotify, postData);
  return res;
};

export const getAllNotifications = async (postData) => {
  const res = await axiosService.post(
    APIS.notifications.getAllNotifications,
    postData
  );
  return res;
};

export const getAllRegulatorDeviceId = async (postData) => {
  const res = await axiosService.get(
    APIS.notifications.getAllRegulatorDeviceId,
    postData
  );
  return res;
};

const transactionStatus = async (postData) => {
  console.log(postData)
  const res = await axiosService.post(APIS.APPLICANT.ADD_TRANSACTION, postData);
  return res;
};
const updatePaymentStatus = async (postData) => {
  const res = await axiosService.put(
    APIS.PAYMENT.UPDATE_PAYMENT_STATUS,
    postData
  );
  return res;
};

const savePaymentRefNumber = async (referenceNo) => {
  paymentReferenceNo = referenceNo;
  console.log(paymentReferenceNo)
  return paymentReferenceNo;
};

const getPaymentRefNumber = async () => {
 // setPaymentReferenceNo(referenceNo)
  return paymentReferenceNo;
};

export const applicantService = {
  addInstitute,
  updateParentCode,
  addInstitutePoc,
  getApplicantDetails,
  initiatePayment,
  initiatePaymentForNewForm,
  updateApplicantDeviceId,
  sendPushNotification,
  getAllRegulatorDeviceId,
  transactionStatus,
  updatePaymentStatus,
  getAllNotifications,
  sendEmailNotification,
  readNotification,
  checkIsEmailExist,
  savePaymentRefNumber,
  getPaymentRefNumber
};
