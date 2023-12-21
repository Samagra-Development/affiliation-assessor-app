import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ROUTE_MAP from "../routing/routeMap";

import CommonLayout from "../components/CommonLayout";
import Button from "../components/Button";

import { login, isUserActive } from "../api";
import { setCookie } from "../utils";

const LoginMedical = ({ handleStepChangeForLogin }) => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function userIsAdminForPortal(registrations) {
    const currentRegistration = registrations[0];
    return (
      currentRegistration !== null &&
      currentRegistration.roles.includes("Admin")
    );
  }

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Either username or password is missing");
      setTimeout(() => {
        setError("");
      }, 3000);
      return;
    }

    try {
      const userIsValidRes = await isUserActive(username)
      if (!userIsValidRes) {
        setError("User not found. Please contact system administrator.");
        setTimeout(() => {
          setError("");
        }, 3000);
        return
      }

      const loginRes = await login(username, password);
      if (loginRes?.accessToken) {
        setCookie("userData", loginRes);
        navigate(ROUTE_MAP.root_star);
      }
      if (loginRes?.errors?.length > 0) {
        if (loginRes?.errors?.[0] === "Credentials have authorization issue") {
          setError("Invalid Username/ Password");
        } else {
          setError(loginRes?.errors?.[0]);
        }
        setTimeout(() => {
          setError("");
        }, 3000);
        return;
      }

      if (loginRes?.error) {
        // console.log(loginRes?.error)
        loginRes?.error === "Unable to get user details" ? setError("User not found. Please contact administrator") :
          setError("Invalid Username/ Password");
        setTimeout(() => {
          setError("");
        }, 3000);
        return
      }

      setError("An internal server error occurred");
      setTimeout(() => {
        setError("");
      }, 3000);

    } catch (error) {
      setError("Something went wrong");
      setTimeout(() => {
        setError("");
      }, 3000);
    }


  };

  return (
    <CommonLayout
      backFunction={handleStepChangeForLogin}
      backDisabled
      logoutDisabled
    >
      <div className="flex flex-col px-5 h-[calc(100vh-176px)] gap-5 overflow-y-auto">
        <div className="flex">
          <img
            src="/assets/affiliationHome.png"
            className="w-[64%] m-auto lg:h-60 lg:mt-[40px]"
            alt="illustration"
          />
        </div>

        <div className="flex flex-col w-80 lg:w-[70%] animate__animated animate__fadeInDown gap-6 mx-auto">
          <div className="flex flex-col gap-2">
            <div className="text-secondary text-[14px] font-medium">
              Enter Email id
            </div>
            <input
              type="text"
              placeholder="Enter Email id"
              className="border-2 border-primary p-3.5"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-secondary text-[14px] font-medium">
              Enter Password
            </div>
            <input
              type="password"
              placeholder="Enter password"
              className="border-2 border-primary p-3.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == "Enter") handleLogin();
              }}
            />
          </div>
        </div>

        {error && (
          <span className="text-white animate__animated animate__headShake bg-red-500 w-80 font-medium px-4 py-3 text-center mx-auto">
            {error}
          </span>
        )}

        <Button
          text={"Sign In"}
          styles="w-80 lg:w-[70%] animate__animated animate__fadeInDown mx-auto bg-primary mt-2 border-primary text-white"
          onClick={handleLogin}
        />

        <Button
          text={"Reset Password"}
          styles="w-80 lg:w-[70%] bg-white border-[#DBDBDB] border-1 text-[#535461] hover:text-[#535461] mx-auto mt-2"
          onClick={() => navigate(ROUTE_MAP.forgot_password)}
        />

        <div className="text-[#535461] w-80 mx-auto text-[16px] text-center">
          By continuing you agree to our{" "}
          <Link to="/" className="text-blue-600/100">
            Terms and Conditions
          </Link>
        </div>
      </div>
    </CommonLayout>
  );
};

export default LoginMedical;
