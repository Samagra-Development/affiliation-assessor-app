import axios from "axios";
import { getCookie, makeHasuraCalls } from "../utils";
import customPost from "./customPost";
import customPostPdf from "./customPostPdf";
import {APIS} from "../constants/index";

//nconst BASE_URL = process.env.REACT_APP_USER_SERVICE_URL;
const KEYCLOAK_BASE_URL =
  process.env.REACT_APP_WEB_PORTAL_USER_SERVICE_URL ||
  "https://uphrh.in/api/api/v1/user/";
const applicationId = process.env.REACT_APP_APPLICATION_ID;
const ENKETO_MANAGER_URL = process.env.REACT_APP_ENKETO_MANAGER_URL;
const ENKETO_URL = process.env.REACT_APP_ENKETO_URL;
const keyCloakAxiosService = axios.create({
  baseURL: KEYCLOAK_BASE_URL,
});

keyCloakAxiosService.interceptors.request.use(
  (request) => {
    console.log(request);
    // const user_data = getCookie('userData');
    request.headers["Accept"] = "*/*";
    request.headers["Content-Type"] = "application/json";
    return request;
  },
  (error) => {
    return Promise.reject(error);
  }
);

keyCloakAxiosService.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    let res = error.response;
    if (res.status === 401) {
      console.error("Unauthorized  user. Status Code: " + res.status);
      // window.location.href = “https://example.com/login”;
    }
    console.error("Looks like there was a problem. Status Code: " + res.status);
    return Promise.reject(res?.data?.error);
  }
);
// export const loginMedical = async (username, pass) => {
//   try {
//     const res = await axios.post(BASE_URL + "login", {
//       password: pass,
//       loginId: username,
//       applicationId: applicationId,
//     });
//     return res.data;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// };
export const login = async (username, pass) => {
  try {
    const res = await keyCloakAxiosService.post(
      KEYCLOAK_BASE_URL + "keycloak/usrlogin",
      {
        password: pass,
        username: username,
      },
      {
        headers: {
          "Content-Type": "application/json",
          // "Authorization": getCookie("access_token")
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJSR3RkMkZzeG1EMnJER3I4dkJHZ0N6MVhyalhZUzBSSyJ9.kMLn6177rvY53i0RAN3SPD5m3ctwaLb32pMYQ65nBdA",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};

// export const sendOtpToMobile = async (mobile) => {
//   try {
//     const res = await axios.post(
//       BASE_URL + "changePassword/sendOTP",
//       {
//         username: mobile,
//       },
//       { headers: { "x-application-id": applicationId } }
//     );
//     return res.data;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// };

export const base64ToPdf = async (postData) => {
  const res = await customPostPdf.post("/convert-via-puppeteer/pdfpuppeteer", {
    url: postData,
  });
  return res;
};

// export const verifyOtpSavePassword = async (mobile, pass, otp) => {
//   try {
//     const res = await axios.patch(
//       BASE_URL + "changePassword/update",
//       {
//         username: mobile,
//         password: pass,
//         OTP: otp,
//       },
//       { headers: { "x-application-id": applicationId } }
//     );
//     return res.data;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// };

export const getAssessor = async (postData) => {
  const res = await customPost.post("rest/getAssessor", postData);
  return res;
};

export const getTodaysAssessment = async (postData) => {
  const res = await customPost.post("rest/getTodaysInspections", postData);
  return res;
};

export const getValidatedAssessor = async (postData) => {
  const res = await customPost.post("rest/getValidation", postData);
  return res;
};

export const getCoursesOfInstitutes = async (postData) => {
  const res = await customPost.post("rest/getCourseType", postData);
  return res;
};

export const getCoursesForAccordions = async (postData) => {
  const res = await customPost.post("rest/getCourses", postData);
  return res;
};

export const getUpcomingAssessments = async (postData) => {
  const res = await customPost.post("rest/getUpcomingInspections", postData);
  return res;
};
export const getPendingInspections = async (postData) => {
  const res = await customPost.post("rest/getPendingInspections", postData);
  return res;
};

export const getPastInspections = async (postData) => {
  const res = await customPost.post("rest/getPastInspections", postData);
  return res;
};

export const registerEvent = async (postData) => {
  const events = {
    events: [],
  };
  events.events.push(postData);
  const res = await customPost.post("rest/addEvents", events);
  return res;
};

export const updateFormStatus = async (postData) => {
  const res = await customPost.put("rest/updateForm", postData);
  return res;
};

export const UploadImage = async (postData) => {
  const res = await axios.post(
    `${ENKETO_MANAGER_URL}/form/uploadFile`,
    postData,
    {
      Accept: "*/*",
      "Content-Type": "multipart/form-data",
    }
  );
  return res;
};

export const getStatusOfForms = async (postData) => {
  const res = await customPost.post("rest/getFormStatus", postData);
  return res;
};

export const ValidateAssessor = async (postData) => {
  const res = await customPost.post("rest/validateAssessor", postData);
  return res;
};

export const getMedicalAssessments = (submittedDate) => {
  const query = {
    query: `
      query ($date: date) {
        assessment_schedule(where: {date: {_eq: $date}}) {
          id
          institute{
            id
            name
            sector
            district
            latitude
            longitude
            email
            institute_types{
              id
              types
            }
            institute_pocs {
              id
              name
              number
            }
          }
        }
      }
      `,
    variables: {
      date: submittedDate || new Date().toISOString().split("T")[0],
    },
  };
  return makeHasuraCalls(query);
};

export const getMedicalAssessmentsUpcoming = () => {
  const query = {
    query: `
      query {
        assessment_schedule(where: {date: {_gt: "${
          new Date().toISOString().split("T")[0]
        }"}}, order_by: {date: asc}){
          id
          date
          institute{
            id
            district
          }
        }
      }
      `,
    variables: {},
  };
  return makeHasuraCalls(query);
};

export const getPrefillXML = async (
  form,
  onFormSuccessData,
  prefillXML,
  imageUrls
) => {
  try {
    const res = await axios.post(
      `${ENKETO_MANAGER_URL}/prefillXML?formUrl=${form}&onFormSuccessData=${encodeURI(
        JSON.stringify(onFormSuccessData)
      )}`,
      {
        prefillXML,
        imageUrls,
      },
      { headers: {} }
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const getSubmissionXML = async (form, prefillXML, imageUrls) => {
  try {
    const res = await axios.post(
      `${ENKETO_MANAGER_URL}/submissionXML?form=${form}`,
      {
        prefillXML,
        imageUrls,
      },
      { headers: {} }
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const getRandomOsceFormsTeacher = async (type) => {
  try {
    // const years = ['1st_year', '2nd_year', '3rd_year'];
    const years = ["1st_year"];
    const year = years[Math.floor(Math.random() * years.length)];
    const res = await axios.get(
      `${ENKETO_MANAGER_URL}/osceFormTeachers/${type}/${year}`
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};

export const getRandomOsceForm = async (type, year, speciality) => {
  try {
    let url = speciality
      ? `${ENKETO_MANAGER_URL}/osceForm/${type}/${year}/${speciality}`
      : `${ENKETO_MANAGER_URL}/osceForm/${type}/${year}`;
    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};

// export const createUser = async (data) => {
//   try {
//     const body = {
//       registration: {
//         applicationId: applicationId,
//         usernameStatus: "ACTIVE",
//         roles: [data.role],
//       },
//       user: {
//         password: data?.password,
//         username: data?.mobile,
//         mobilePhone: data?.mobile,
//       },
//     };

//     const userRes = await axios.post(BASE_URL + "signup", body, {
//       headers: { "x-application-id": applicationId },
//     });

//     if (userRes?.data?.responseCode === "OK") {
//       return userRes.data;
//     } else if (userRes?.data?.status != 200) {
//       const errorStrings = [];
//       const errors = userRes?.data?.exception?.fieldErrors;
//       Object.keys(errors).forEach((key) => {
//         errorStrings.push(errors[key]?.[0]?.message);
//       });
//       return errorStrings.join(". \n");
//     }
//   } catch (error) {
//     const errorStrings = [];
//     const errors = error?.response?.data?.exception?.fieldErrors;
//     Object.keys(errors).forEach((key) => {
//       errorStrings.push(errors[key]?.[0]?.message);
//     });
//     return (
//       errorStrings.join(". \n") ||
//       "An error occured while creating user. Try again"
//     );
//   }
//   return null;
// };

export const saveFormSubmission = (data) => {
  const query = {
    query: `mutation ($object: [form_submissions_insert_input!] = {}) {
      insert_form_submissions(objects: $object) {
        returning {
          form_id
          created_at
          submission_status
        }
      }
    }`,
    variables: { object: data },
  };

  return makeHasuraCalls(query);
};

export const getAssessmentStatus = () => {
  const query = {
    query: `
      {
        form_submissions(where: {assessment_schedule: {date: {_eq: "${
          new Date().toISOString().split("T")[0]
        }"}}}) {
          form_id
          form_name
          created_at
        }
      }
      `,
    variables: {},
  };
  return makeHasuraCalls(query);
};

export const getAssignedForms = (course, assType) => {
  const query = {
    query: `
      {
        osce_assignment(where: {assessment_schedule: {date: {_eq: "${
          new Date().toISOString().split("T")[0]
        }"}}, _and: {assessment_type: {_eq: "${assType}"}, _and: {course_type: {_eq: "${course}"}}}}) {
          assessment_type
          course_type
          id
          osce_names
        }
      }
      `,
    variables: {},
  };
  return makeHasuraCalls(query);
};

export const assignOsceForm = (data) => {
  const query = {
    query: `
    mutation ($object: [osce_assignment_insert_input!] = {}) {
      insert_osce_assignment(objects: $object) {
        returning {
          id
          created_at
        }
      }
    }
      `,
    variables: { object: data },
  };
  return makeHasuraCalls(query);
};

export const getFormSubmissions = () => {
  const query = {
    query: `
      query {
        form_submissions(order_by: {created_at : desc}){
          form_data
          form_name
          created_at
          assessment_schedule {
            institute_id
            assessor_code
          }
      }
    }
      `,
    variables: {},
  };
  return makeHasuraCalls(query);
};

export const isUserActive = async (email) => {
  try {
    const res = await keyCloakAxiosService.post(
      KEYCLOAK_BASE_URL + "emaildetails",
      {
        request:{
          fieldName: "email",
          fieldValue: email
        }
    },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.REACT_APP_AUTH_TOKEN,
        },
      }
    );
    if(res.data[0]){
      return res.data[0].enabled;
    } else {
      return false;
    }
   
  } catch (err) {
    console.log(err);
    return err;
  }
};

export const generateOTP = async (email) => {
  try {
    const res = await keyCloakAxiosService.post(
      KEYCLOAK_BASE_URL + "keycloak/otp",
      {
        username: email,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.REACT_APP_AUTH_TOKEN,
        },
      }
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};
export const getLoginDetails = (userDetails) => {
  return keyCloakAxiosService.post(
    KEYCLOAK_BASE_URL + "keycloak/login",
    userDetails,
    {
      headers: {
        "Content-Type": "application/json",
        // "Authorization": getCookie("access_token")
        Authorization: process.env.REACT_APP_AUTH_TOKEN,
      },
    }
  );
};

export const editUserKeycloak = async (postData) => {
  const res = await keyCloakAxiosService.put(
    KEYCLOAK_BASE_URL + "update",
    postData,
    {
      headers: {
        "Content-Type": "application/json",
        // "Authorization": getCookie("access_token")
        Authorization: process.env.REACT_APP_AUTH_TOKEN,
      },
    }
  );
  return res;
};

export const getEnketoFormData = async (postData) => {
  const res = await customPost.post(
    APIS.groundAnalysis.viewForm,
    postData
  );
  return res;
};

// export const updateFormSubmissions = async (data) => {
//   const res = await customPost.post(
//     APIS.FORM.UPDATE_FORM, data
//   )
//   return res;
// }

export const updateFormSubmissions = (data) => {
  const query = {
    query: `
    mutation ($form_id: Int, $form_data: jsonb, $form_name: String, $submission_status: Boolean, $form_status: String, $assessor_id: String, $applicant_id:Int, $applicant_form_id:Int, $course_id:Int, $submitted_on: date, $schedule_id: Int) {
      update_form_submissions(where: {form_id: {_eq: $form_id}}, _set: {form_data: $form_data, form_name: $form_name, submission_status: $submission_status, form_status: $form_status, assessor_id: $assessor_id, applicant_id:$applicant_id, applicant_form_id:$applicant_form_id, course_id:$course_id, submitted_on:$submitted_on, schedule_id: $schedule_id}) {
        returning {
          form_id
          form_data
        }
      }
    }
      `,
    variables: { ...data },
  };
  return makeHasuraCalls(query);
}
