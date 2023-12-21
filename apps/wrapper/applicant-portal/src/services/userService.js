import axios from "axios";
import { APIS } from "../constants";
import { getCookie } from "../utils";

const BASE_URL =
  process.env.REACT_APP_WEB_PORTAL_USER_SERVICE_URL ||
  "https://uphrh.in/api/api/v1/user/";

const TOKEN_BASE_URL =
  process.env.REACT_APP_TOKEN_URL || "https://odk.upsmfac.org/auth/";

const keyCloakAxiosService = axios.create({
  baseURL: BASE_URL,
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

const accessTokenAxiosService = axios.create({
  baseURL: TOKEN_BASE_URL,
});

accessTokenAxiosService.interceptors.request.use(
  (request) => {
    // const user_data = getCookie('userData');
    request.headers["Accept"] = "*/*";
    request.headers["Content-Type"] = "application/x-www-form-urlencoded";
    return request;
  },
  (error) => {
    return Promise.reject(error);
  }
);

accessTokenAxiosService.interceptors.response.use(
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

const generateOtp = (postData) => {
  return axios.post(`${BASE_URL}${APIS.LOGIN.GENERATE_OTP}`, postData, {
    headers: {
      "Content-Type": "application/json",
      // "Authorization": getCookie("access_token")
      Authorization: process.env.REACT_APP_AUTH_TOKEN,
    },
  });
};

const signup = (userDetails) => {
  return axios.post(`${BASE_URL}${APIS.SIGNUP.CREATE_USER}`, userDetails, {
    headers: {
      "Content-Type": "application/json",
      // "Authorization": getCookie("access_token")
      Authorization: process.env.REACT_APP_AUTH_TOKEN,
    },
  });
};

// Edit user keycloak
export const editUserKeycloak = async (postData) => {
  const res = await axios.put(
    `${BASE_URL}${APIS.EDITUSERS.EDIT_USER}`,
    postData,
    {
      headers: {
        "Content-Type": "application/json",
        // Authorization: getCookie("access_token"),
        Authorization: process.env.REACT_APP_AUTH_TOKEN,
      },
    }
  );
  return res;
};

const login = (userDetails) => {
  return keyCloakAxiosService.post(APIS.LOGIN.USERLOGIN, userDetails, {
    headers: {
      "Content-Type": "application/json",
      // "Authorization": getCookie("access_token")
      Authorization: process.env.REACT_APP_AUTH_TOKEN,
    },
  });
};

const getAccessToken = (postData) => {
  return accessTokenAxiosService.post(APIS.ACCESS_TOKEN.TOKEN_URL, postData);
};

const isUserActive = (postData) => {
  return keyCloakAxiosService.post(APIS.USER.CHECKVALID,
     {
      request:{
        fieldName: "email",
        fieldValue: postData.email
      }
  },
     {
    headers: {
      "Content-Type": "application/json",
      // "Authorization": getCookie("access_token")
      Authorization: process.env.REACT_APP_AUTH_TOKEN,
    },
  });

};
export const userService = {
  generateOtp,
  login,
  signup,
  getAccessToken,
  isUserActive
};
