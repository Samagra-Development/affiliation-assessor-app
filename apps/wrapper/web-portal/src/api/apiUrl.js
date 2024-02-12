const rest = "rest/";
const prefix = "v1/comment/";

const API_URL = {
  auth: {
    register: `${rest}createAdmin`,
    getRegulator: `${rest}getRegulator`,
  },
  common: {
    registerEvent: `${rest}addEvents`,
    updateForm: `${rest}updateForm`,
    updateFormStatusForOGA: `${rest}updateFormStatusForOGA`,
    updateRegulatorDeviceId: `${rest}updateRegulatorDeviceId`,
  },
  notifications: {
    //new APIs
    getAllNotifications: `notification/all`,
    sendPushNotification: `notification/send`,
    readNotification: `notification/update`,
    getAllRegulatorDeviceId: `${rest}getAllRegulatorDeviceId`,
    getApplicantDeviceId: `${rest}getApplicantDeviceId`,
    emailNotify: `email/notify`,
  },
  dashboard:{
    search:`${rest}searchDashboardForms`,
    filter:`${rest}filterSubmittedFormByRound`,
    progresscount:`${rest}getInProgressSubmissionCount`,
    approvedcount:`${rest}getApprovedSubmissionCount`,
    rejectedcount:`${rest}getRejectedSubmissionsCount`
  },
  groundAnalysis: {
    viewForm: `${rest}getFormData`,
    list: `${rest}getOGIA`,
    OGAFormsList: `${rest}getOGAList`,
    markStatus: `${rest}inProgress`,
    acceptApplicantNoc: `${rest}acceptFormR1`,
    acceptApplicantCertificate: `${rest}acceptFormR2`,
    rejectApplicant: `${rest}rejectForm`,
    getGroundInspectionAnalysis: `${rest}getGroundInspectionAnalysis`,
    filterOGA: `${rest}filterOGA`,
    OGAFormsCount:`${rest}getOGAFormsCountByRoundAndFormStatus`
  },
  manageForms: {
    getForms: `${rest}getForms`,
    convertODKtoXML: `user/convert`,
    nocPdfUpload: `user/upload`,
    createForm: `${rest}createForm`,
    publishForms: `${rest}publishForms`,
    unpublishForms: `${rest}unpublishForms`,
    viewForm: `${rest}viewForm`,
    duplicateForm: `${rest}duplicateForm`,
    deleteForm: `${rest}deleteForm`,
    filterForms: `${rest}filterForms`,
    createCourses: `${rest}createCourse`,
    updateForms: `${rest}updateForms`,
    getCourses: `${rest}getCourseMapping`,
    findForms: `${rest}findForms`,
  },
  manageUsers: {
    getAllAssessors: `${rest}getAllAssessors`,
    getAllRegulators: `${rest}getAllRegulators`,
    getRegulatorsByRole: `${rest}filterRegulatorByRole`,
    specificUser: `${rest}getSpecificUser`,
    filterUsers: `${rest}filterUsers`,
    setActivate: `${rest}setValid`,
    setDeactive: `${rest}setInvalid`,
    setRegulatorActive: `${rest}regulator/activate`,
    setRegulatorDeactive: `${rest}regulator/deactivate`,
    addUsers: `${rest}addUsers`,
    deleteUser: `${rest}deleteUser`,
    editUser: `${rest}editUser`,
    viewSchedule: `${rest}viewSchedule`,
    getAllInstitutes:  `${rest}getAllInstitutes`,
  },
  manageRoles: {
    getAll: `${rest}getAllRolesWithPermissions`,
    editRole: `${rest}updateRoleById`,
    addRole: `${rest}addNewRoleWithPermission`,
    toggleRoleStatus: `${rest}updateRoleById`,
  },
  desktopAnalysis: {
    getUsersForSchedulingAssessment: `${rest}getUsersForSchedulingAssessment`,
    scheduleAssessment: `${rest}addAssessmentSchedule`,
    getDesktopAnalysisForms: `${rest}getDesktopAnalysis`,
    getCourseOGA: `${rest}getCoursesOGA`,
    filterDesktopAnalysis: `${rest}filterDesktopAnalysis`,
    updateFormSubmission: `${rest}updateFormSubmission`,
    addInstituteCourse: `${rest}addInstituteCourse`,
    updatePaymentStatus: `${rest}updatePaymentStatus`,
    getTransactionDetail: `v1/user/transaction`,
    getOGAFormDetails: `${rest}getOGAFormForInspectionSchedule`
  },
  certificateManagement: {
    getNOCCertificate: `${rest}getNOCCertificate`,
  },
  scheduleManagement: {
    getAssessmentSchedule: `${rest}getAssessmentSchedule`,
    filterAssessments: `${rest}filterAssessments`,
    addAssessmentSchedule: `${rest}addAssessmentSchedule`,
    deleteSchedule: `${rest}deleteSchedule`,
    getAllSchedule: `${rest}getUpcomingSchedules`,
    uploadAssessmentSchedule: `${rest}upload/assessor/schedule`,
  },
  viewStatus: {
    getViewStatus: `${rest}getEvents`,
  },
  manageUserComments: {
    getAll: `${prefix}getAll`,
    update:`${prefix}addNew`,
    addFirst:`${prefix}addFirst`,
  },
  SIGNUP: {
    CREATE_USER: "create",
    EDIT_USER: "update",
    CHECK_IS_EMAIL_EXIST: `${rest}findUserByEmail`,
  },
  USER: {
    ACTIVATE: "activate",
    DEACTIVATE: "deactivate",
    CHECKVALID: "emaildetails",
    CREATE_BULK: "keycloak/pushBulkUserBG",
  },
  LOGIN: {
    GENERATE_OTP: "keycloak/otp",
    USERLOGIN: "keycloak/login",
  },
  DELETE: {
    DELETE_USER: "deactivate",
  },
  NOTIFICATION: {
    SEND_SMS: "",
    SEND_EMAIL: "",
    SAVE: "",
    GET: "",
  },
  GLOBAL_SEARCH: {
    searchUsers: `${rest}searchUsers`,
    searchDesktop: `${rest}searchDesktop`,
    searchOGA: `${rest}searchOGA`,
    searchForms: `${rest}searchForms`,
    searchAssessments: `${rest}searchAssessments`,
    searchNOC: `${rest}searchNOC`
  },
  ACCESS_TOKEN: {
    TOKEN_URL: "realms/sunbird-rc/protocol/openid-connect/token",
  },
};

export default API_URL;
