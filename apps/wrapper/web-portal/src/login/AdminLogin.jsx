import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import ADMIN_ROUTE_MAP from "../routes/adminRouteMap";
import { userService } from "../api/userService";
import { getRegulator, updateRegulatorDeviceId } from "../api/index";
import { Card, Label, Button, Input } from "../components";
import { useForm } from "react-hook-form";
import { setCookie, getCookie, removeCookie } from "../utils/common";
import { forkJoin, lastValueFrom, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { ContextAPI } from "../utils/ContextAPI";

const AdminLogin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [enableOtp, setEnableOtp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [emailId, setEmailId] = useState(null);
  const [verifyEnteredOtp, setVerifyEnteredOtp] = useState(true);
  const navigate = useNavigate();
  const { setSpinner, setToast, toast } = useContext(ContextAPI);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    console.log("checking login ........")
    // Check if user is already logged in (e.g., using your authentication logic)
    const checkLoggedInStatus = () => {
      const isAuthenticated = getCookie("userData");

      if (isAuthenticated) {
        setIsLoggedIn(true);
        navigate(ADMIN_ROUTE_MAP.adminModule.manageForms.home); // Redirect to home page
      }
    };

    checkLoggedInStatus();
  }, [navigate]);

  const login = async (data) => {
    try {

      const otpRes = await userService.generateOtp({
        username: data.email,
      });
      console.log(otpRes);
      if (otpRes.data === "Sending OTP to user mail") {
        setEnableOtp(true);
        // setPhoneNumber(data.phone);
        setEmailId(data.email);
      } else {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: otpRes?.data?.error ? otpRes?.data?.error : "Something went wrong",
          toastType: "error",
        }));
        console.log("Something went wrong", otpRes);
      }

    } catch (error) {
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "User not registered.",
        toastType: "error",
      }));
      console.log("Otp not sent due to some error", error);
    }
  };

  const isUserActive = async (data) => {
    setSpinner(true);
    try {
      const res = await userService.isUserActive(data);
      if (res?.data[0]?.enabled) {
        login(data);
        setSpinner(false);
      } else {
        setSpinner(false);
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "User not found. Please contact system admin.",
          toastType: "error",
        }));
      }
      
    } catch (error) {
      setSpinner(false);
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong. Please try again later. ",
        toastType: "error",
      }));
    }
   
  }

  const verifyOtp = async (data) => {
    try {
      setSpinner(true);
      const loginDetails = {
        email: data.email,
        otp: Number(data.otp),
      };

      const loginRes = await userService.login(loginDetails);
     // console.log(loginRes);

      if (loginRes?.data?.error) {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "Enter the correct OTP.",
          toastType: "error",
        }));
        return;
      }



      const user_details = loginRes?.data?.userRepresentation;
      const adminDetailsRes = await getRegulator({
        user_id: user_details?.id,
      });
      const role = loginRes?.data?.userRepresentation?.attributes?.Role?.[0];
      setCookie("userData", loginRes.data);
      setCookie("regulator", adminDetailsRes.data.regulator);
      if (role === "Super-Admin" || role === "Desktop-Admin") {
        navigate(ADMIN_ROUTE_MAP.adminModule.manageUsers.home);
      }
      else if (role === "Desktop-Assessor") {
        navigate(ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home);
      }
      else {
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "Invalid user.",
          toastType: "error",
        }));
      }

      //setting device ID
      if (getCookie("firebase_client_token") !== undefined) {
        await updateRegulatorDeviceId({
          user_id: getCookie("userData")?.userRepresentation?.id,
          device_id: JSON.stringify([getCookie("firebase_client_token")]),
        });
      }
    } catch (error) {
      console.log(
        "some error @ login", error);
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong. Please try again later.",
        toastType: "error",
      }));

      removeCookie("regulator");
      removeCookie("userData");
    } finally {
      setSpinner(false);
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
                   // login(data);
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
                      <div className="text-red-500 mt-2 text-sm">
                        This field is required
                      </div>
                    )}
                    {errors?.email?.type === "pattern" && (
                      <div className="text-red-500 mt-2 text-sm">
                        This is not a valid email format
                      </div>
                    )}
                  </div>
                  {/* <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="phone"
                      text="Mobile Number"
                      required
                    ></Label>
                    <input
                      type="phone"
                      name="phone"
                      id="phone"
                      placeholder="Mobile number"
                      {...register("phone", {
                        required: true,
                        pattern: /^(\+\d{1,3}[- ]?)?\d{10}$/i,
                      })}
                      className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      noValidate
                    />
                    {errors?.phone?.type === "required" && (
                      <div className="text-red-500 mt-2 text-sm">
                        This field is required
                      </div>
                    )}
                    {errors?.phone?.type === "pattern" && (
                      <div className="text-red-500 mt-2 text-sm">
                        This is not a valid mobile number format
                      </div>
                    )}
                  </div> */}
                  <Button
                    moreClass="uppercase text-white w-full mt-7"
                    text="Get Otp"
                    type="submit"
                  ></Button>
                  {/* <div className="flex justify-center my-6">
                    <span className="text-gray-400">Create an account, </span>
                    &nbsp;
                    <Link
                      to={ADMIN_ROUTE_MAP.loginModule.register}
                      className="text-primary-700"
                    >
                      Sign up
                    </Link>
                  </div> */}
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
                      <div className="text-red-500 mt-2 text-sm">
                        This field is required
                      </div>
                    )}
                    {errors?.otp?.type === "pattern" && (
                      <div className="text-red-500 mt-2 text-sm">
                        Please enter 6 digit otp
                      </div>
                    )}
                    {verifyEnteredOtp == false && (
                      <div className="text-red-500 mt-2 text-sm">
                        Please enter the correct OTP
                      </div>
                    )}
                    {/*  {toast.toastOpen && (
                      <div className="text-red-500 mt-2 text-sm">
                        You are not a registered admin.
                      </div>
                    )} */}
                  </div>
                  <Button
                    moreClass="uppercase text-white w-full mt-7"
                    text="Sign in"
                    type="submit"
                  ></Button>
                  <div className="flex justify-center my-6">
                    <span
                      className="text-primary-700 cursor-pointer"
                      onClick={() => {
                        setEnableOtp(false);
                      }}
                    >
                      Go back, re-enter the email id
                    </span>
                  </div>
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

export default AdminLogin;
