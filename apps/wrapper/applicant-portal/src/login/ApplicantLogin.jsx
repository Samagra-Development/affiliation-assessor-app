import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import { Card, Label, Button } from "../components";
import APPLICANT_ROUTE_MAP from "../routes/ApplicantRoute";
import { userService, applicantService } from "../services";
import { setCookie, getCookie, removeCookie } from "../utils";
import { forkJoin, lastValueFrom, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { ContextAPI } from "../utils/contextAPI";

const ApplicantLogin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [enableOtp, setEnableOtp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [emailId, setEmailId] = useState(null);
  const [verifyEnteredOtp, setVerifyEnteredOtp] = useState(true);
  const navigate = useNavigate();
  const { setToast, toast } = useContext(ContextAPI);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  useEffect(() => {
    // Check if user is already logged in (e.g., using your authentication logic)
    const checkLoggedInStatus = () => {
      const isAuthenticated = getCookie("userData");

      if (isAuthenticated) {
        setIsLoggedIn(true);
        navigate(APPLICANT_ROUTE_MAP.dashboardModule.my_applications); // Redirect to home page
      }
    };

    checkLoggedInStatus();
  }, [navigate]);


  const isUserActive = async (data) => {
    //setSpinner(true);
    try {
      const res = await userService.isUserActive(data);
      if (res?.data[0]?.enabled) {
        login(data);
        //setSpinner(false);
      } else {
        //setSpinner(false);
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "User not found. Please contact system admin.",
          toastType: "error",
        }));
        return
      }
      
    } catch (error) {
     // setSpinner(false);
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong. Please try again later. ",
        toastType: "error",
      }));
    }
   
  }

  const login = async (data) => {
    try {
      const otpRes = await userService.generateOtp({
        username: data.email,
      });
      console.log(otpRes);
      if (otpRes.data === "Sending OTP to user mail") {
        setEnableOtp(true);
        setEmailId(data.email);
      } else {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: otpRes?.data?.error ? otpRes?.data?.error : "Something went wrong.Please try again later",
          toastType: "error",
        }));
     //   console.log("Something went wrong", otpRes);
    
      }
    } catch (error) {
      console.log("Otp not sent due to some error", error);
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong.Please try again later",
        toastType: "error",
      }));
    }
  };

  const verifyOtp = async (data) => {
    try {
      const loginDetails = {
        email: data.email,
        otp: Number(data.otp),
      };

      const loginRes = await userService.login(loginDetails);

      const applicantDetailsRes = await applicantService.getApplicantDetails({
        user_id: loginRes.data.userRepresentation.id,
      });

      //setting device ID
      if (getCookie("firebase_client_token") !== undefined) {
        await applicantService.updateApplicantDeviceId({
          user_id: loginRes.data.userRepresentation.id,
          device_id: JSON.stringify([getCookie("firebase_client_token")]),
        });
      }

      const role = loginRes?.data?.userRepresentation?.attributes?.Role?.[0];

      if (role === "Institute") {
        setCookie("userData", loginRes.data);
        setCookie("institutes", applicantDetailsRes.data.institutes);
        navigate(APPLICANT_ROUTE_MAP.dashboardModule.my_applications);
      } else {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "Invalid user.",
          toastType: "error",
        }));
      }
    } catch (error) {
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Enter the correct OTP.",
        toastType: "error",
      }));
      console.log(
        "Otp veriification and login failed due to some error",
        error
      );
      removeCookie("institutes");
      removeCookie("userData");
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <Card moreClass="shadow-md w-screen sm:px-24 sm:w-[480px] md:w-[600px] py-16">
          <div className="flex flex-col">
            <h1 className="text-2xl font-medium text-center mb-8">Login</h1>

            {!enableOtp && (
              <>
                <form
                  onSubmit={handleSubmit((data) => {
                    //login(data);
                    isUserActive(data)
                  })}
                  noValidate
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" text="Email id" required></Label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      placeholder="name@email.com"
                      {...register("email", {
                        required: true,
                        pattern:
                          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i,
                      })}
                      className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      noValidate
                    />
                    {errors?.email?.type === "required" && (
                      <p className="text-red-500 mt-2 text-sm">
                        This field is required
                      </p>
                    )}
                    {errors?.email?.type === "pattern" && (
                      <p className="text-red-500 mt-2 text-sm">
                        This is not a valid email format
                      </p>
                    )}
                  </div>
                  <Button
                    moreClass="uppercase w-full mt-7 text-white"
                    text="Get Otp"
                    type="submit"
                  ></Button>
                  <p className="flex justify-center my-6">
                    <span className="text-gray-400">Create an account, </span>
                    &nbsp;
                    <Link
                      to={APPLICANT_ROUTE_MAP.dashboardModule.register}
                      className="text-primary-700"
                    >
                      Sign up
                    </Link>
                  </p>
                </form>
              </>
            )}
            {enableOtp && (
              <>
                <form
                  onSubmit={handleSubmit((data) => {
                    verifyOtp(data);
                  })}
                  noValidate
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp" text="Enter OTP" required></Label>
                    <input
                      type="otp"
                      name="otp"
                      id="otp"
                      placeholder="0-0-0-0-0-0"
                      {...register("otp", {
                        required: true,
                        pattern: /^\d{1,6}$/i,
                      })}
                      className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      noValidate
                    />
                    {errors?.otp?.type === "required" && (
                      <p className="text-red-500 mt-2 text-sm">
                        This field is required
                      </p>
                    )}
                    {errors?.otp?.type === "pattern" && (
                      <p className="text-red-500 mt-2 text-sm">
                        Please enter 6 digit otp
                      </p>
                    )}
                    {verifyEnteredOtp == false && (
                      <p className="text-red-500 mt-2 text-sm">
                        Please enter the correct OTP
                      </p>
                    )}
                  {/*   {toast.toastOpen && (
                      <p className="text-red-500 mt-2 text-sm">
                        You are not a registered institute.
                      </p>
                    )} */}
                  </div>
                  <Button
                    moreClass="uppercase text-white w-full mt-7"
                    text="Sign in"
                    type="submit"
                  ></Button>
                  <p className="flex justify-center my-6">
                    <span
                      className="text-primary-700 cursor-pointer"
                      onClick={() => {
                        setEnableOtp(false);
                      }}
                    >
                      Go back, re-enter the email id
                    </span>
                  </p>
                </form>
              </>
            )}
          </div>
        </Card>
      </>
    );
  }

  return null;
};

export default ApplicantLogin;
