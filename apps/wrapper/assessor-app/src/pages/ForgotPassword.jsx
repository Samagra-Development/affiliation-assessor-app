import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ROUTE_MAP from "../routing/routeMap";

import CommonLayout from "../components/CommonLayout";
import Button from "../components/Button";
import OtpInput from "react-otp-input";

import { logout } from "./../utils/index";
import { generateOTP, getLoginDetails, editUserKeycloak, isUserActive } from "../api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [mobile, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(false);
  const [otpPage, setOtpPage] = useState(false);
  const [changePasswordPage, setChangePasswordPage] = useState(false);
  const [passChanged, setPassChanged] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [details, setDetails] = useState({});
  const [newPassConfirm, setNewPassConfirm] = useState("");

  let email = "";
  const handleEmail = (val) => {
    email = val;
    setEmail(val);
  };

  const handleResetToLogin = () => {
    logout();
  };

  const changePassword = async () => {
    if (!newPass) {
      setError({ err1: "This field is required" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (!newPassConfirm) {
      setError({ err2: "This field is required" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPass.length < 3) {
      setError({ err1: "Password must be atleast of 3 characters" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPassConfirm.length < 3) {
      setError({ err2: "Password must be atleast of 3 characters" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPass != newPassConfirm) {
      setError({ err: "Passwords do not match" });
      setTimeout(() => setError(false), 3000);
      return;
    }

    const postData = {
      userName: details.userRepresentation.id,
      request: {
        firstName: details.userRepresentation.firstName,
        lastName: details.userRepresentation.lastName,
        enabled: true,
        email: details.userRepresentation?.email,
        emailVerified: false,
        credentials: [
          {
            type: "password",
            value: newPass,
            temporary: "false",
          },
        ],
        attributes: {
          Role: "Assessor",
        },
      },
    };
    const updatePass = await editUserKeycloak(postData);
    if (updatePass) {
      setPassChanged(true);
    }
  };
  const handleVerifyEmail = async () => {
    let emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(mobile)) {
      setError(true);
      setTimeout(() => setError(false), 3000);
      return;
    } else {
      setEmail(mobile);

      if(await isUserActive(mobile)){
        let res = await generateOTP(mobile);
        if (res === "Sending OTP to user mail") setOtpPage(true);
      } else {
        setError("User Not Found. Please contact system admin.");
        setTimeout(() => setError(false), 3000);
      }
    
    }
  };

  const verifyOtpAndChangePassword = async () => {
    if (otp.length != 6) {
      setError("Please enter a valid OTP");
      setTimeout(() => setError(false), 3000);
      return;
    }
    const loginDetails = {
      email: mobile,
      otp: Number(otp),
    };

    const loginRes = await getLoginDetails(loginDetails);

    setDetails(loginRes.data);
    // const res = await verifyOtpSavePassword(mobile, newPass, otp);
    if (loginRes.status === 200) {
      if(loginRes.data.error === "OTP mismatch"){
        setError("Wrong OTP entered");
        setTimeout(() => setError(false), 3000);
        return;
      }
      setChangePasswordPage(true);
      setOtpPage(false);
    } else if (loginRes?.params?.err == "INVALID_OTP_USERNAME_PAIR") {
      setError("Wrong OTP entered");
      setTimeout(() => setError(false), 3000);
      return;
    } else {
      setError("Unable to update password. Please try again later");
      setTimeout(() => setError(false), 3000);
      return;
    }
  };

  const sendOtp = async () => {
    if (!newPass) {
      setError({ err1: "This field is required" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (!newPassConfirm) {
      setError({ err2: "This field is required" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPass.length < 3) {
      setError({ err1: "Password must be atleast of 3 characters" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPassConfirm.length < 3) {
      setError({ err2: "Password must be atleast of 3 characters" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    if (newPass != newPassConfirm) {
      setError({ err: "Passwords do not match" });
      setTimeout(() => setError(false), 3000);
      return;
    }
    // const res = await sendOtpToMobile(mobile);
    // if (res.responseCode == "OK") setOtpPage(true);
    else setError("Unable to send OTP. Please try again later");
  };

  return (
    <CommonLayout
      back={ROUTE_MAP.login}
      logoutDisabled
      pageTitle="Reset Password"
    >
      {/* Entering email id for password change */}
      {!otpPage && !changePasswordPage && !passChanged && (
        <div className="flex flex-col px-3 py-8 h-5/6 justify-between h-[90%]">
          <div className="w-full">
            <p className="text-secondary text-2xl font-bold">
              Enter a valid email id
            </p>
            <input
              className={`${
                error && "border-red-500 animate__animated animate__headShake"
              } border-2 rounded px-3 py-4 text-xl mt-10 w-full`}
              type="email"
              onChange={(e) => handleEmail(e.target.value)}
            />
            {error && (
              <p className="text-red-500 text-sm font-bold py-1">
                {error.length ? error : "Please enter a valid email id"}
              </p>
            )}
           </div>
            
          <button className="w-full p-2 flex justify-center border" 
           onClick={handleVerifyEmail} >Next</button>
         </div>
      )}

      {/* Entering OTP to change the password  */}
      {otpPage && !passChanged && (
        <div className="flex flex-col px-3 py-8 h-5/6 justify-between h-[90%]">
          <div className="w-full">
            <p className="text-secondary text-xl lg:text-2xl font-bold">
              Enter OTP sent on  :
              <span className="text-primary text-xl lg:text-3xl  py-4">
              &nbsp;{mobile}
            </span>
            </p>
            
            <style>
              {`
                .error-otp {
                    border: 1.5px solid red !important;
                }
              `}
            </style>
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={6}
              containerStyle={"w-full py-6"}
              inputStyle={{
                border: "1px solid #9b9b9b",
                borderRadius: "0.25rem",
                marginRight: "8px",
                height: "3rem",
                width: "3rem",
                fontSize: "1.5rem",
                color: "rgba(0,0,0,0.5)",
              }}
              isInputNum
              hasErrored={error}
              errorStyle={"animate__animated animate__headShake error-otp"}
              shouldAutoFocus={true}
            />
            {/*  <OtpInput
      value={otp}
      onChange={setOtp}
      numInputs={6}
      renderSeparator={<span>-</span>}
      renderInput={(props) => <input {...props} />}
      shouldAutoFocus={true}
      containerStyle={"w-full py-6"}
      inputStyle={{
        border: "1px solid #9b9b9b",
        borderRadius: "0.25rem",
        marginRight: "8px",
        height: "3rem",
        width: "3rem",
        fontSize: "1.5rem",
        color: "rgba(0,0,0,0.5)",
      }}
      isInputNum
      hasErrored={error}
      errorStyle={"animate__animated animate__headShake error-otp"}
    /> */}
            {error && (
              <p className="text-red-500 text-sm font-bold py-1">{error} </p>
            )}
          </div>
          <Button text="Verify OTP" onClick={verifyOtpAndChangePassword} />
        </div>
      )}

      {/* Change password page  */}
      {!otpPage && changePasswordPage && !passChanged && (
        <div className="flex flex-col px-3 py-8 h-5/6 justify-between h-[90%]">
          <div className="w-full">
            <p className="text-secondary text-xl font-bold">
              Change Password Here
            </p>
            <input
              className={`border ${
                (error?.err1 || error?.err) &&
                "border-2 border-red-400 animate__animated animate__headShake"
              } border-primary rounded px-3 py-3 text-lg mt-10 w-full`}
              placeholder="New Password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              type="password"
            />
            {(error?.err1 || error?.err) && (
              <p className="text-red-500 text-sm font-bold py-1">
                {error?.err1 || error?.err}
              </p>
            )}
            <input
              className={`border ${
                (error?.err2 || error?.err) &&
                "border-2 border-red-400 animate__animated animate__headShake"
              } border-primary rounded px-3 py-3 text-lg mt-10 w-full`}
              placeholder="Confirm New Password"
              value={newPassConfirm}
              type="password"
              onChange={(e) => setNewPassConfirm(e.target.value)}
            />
            {(error?.err2 || error?.err) && (
              <p className="text-red-500 text-sm font-bold py-1">
                {error?.err2 || error?.err}
              </p>
            )}
            {error.length ? error : ""}
          </div>
          <Button text="Reset" onClick={changePassword} />
        </div>
      )}

      {/* Password changed successful page  */}
      {passChanged && (
        <div className="flex flex-col px-3 py-8 h-100 justify-between h-[90%]">
          <div className="w-full">
            <p className="text-secondary text-xl font-bold">
              Your password has been changed successfully
            </p>
            <p
              className="text-primary text-xl py-8 font-bold cursor-pointer"
              onClick={() => handleResetToLogin()}
            >
              Click here to login
            </p>
          </div>
        </div>
      )}
    </CommonLayout>
  );
};

export default ForgotPassword;
