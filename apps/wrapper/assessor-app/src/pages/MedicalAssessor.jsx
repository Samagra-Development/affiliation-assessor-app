import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ROUTE_MAP from "../routing/routeMap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsis,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";

import { getAssessor } from "../api";
import { getCookie, setToLocalForage } from "../utils";

import Button from "../components/Button";
import CommonLayout from "../components/CommonLayout";

const MedicalAssessor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState("");
  const [role, setRole] = useState("");
  const handleClick = (route) => {
    navigate(route);
  };
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const getAssessorDetails = async (email) => {
    const postData = {
      email: email,
    };

    if (!email) {
      navigate(ROUTE_MAP.login);
      return;
    }

    try {
      console.log(postData);
      const res = await getAssessor(postData);
      setData(res?.data?.assessors[0]);
      const requiredData = {
        assessor_user_id: res?.data?.assessors[0].user_id,
      };
      setToLocalForage("required_data", requiredData);
    } catch (error) {
      console.log("here");
      alert(error);
    }
  };

  useEffect(() => {
    const user = getCookie("userData");
    const email = user?.userRepresentation?.email;
    getAssessorDetails(email);
    const roles = user?.userRepresentation?.attributes?.Role?.[0];
    setRole(roles);
  }, []);

  return (
    <CommonLayout back="/login" backDisabled  logoutDisabled={isOnline ? false : true}>
      <div className="flex flex-col px-5 h-[calc(100vh-176px)] overflow-y-auto justify-between">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-2 text-center">
            <img
              src="/assets/account_circle.svg"
              className="h-[52px] lg:h-[72px]"
              alt="illustration"
            />
            <p className=" lg:text-4xl text-secondary text-[24px] font-bold animate__animated animate__fadeInDown tracking-wide">
              {" "}
              Welcome {data?.name}{" "}
            </p>
            <p className="text-center text-gray-500">
              {" "}
              Please check your assigned inspection{" "}
            </p>
          </div>

          <div className="gap-6 flex flex-col">
            <Button
              text="Today's Inspections"
              styles="w-full bg-primary text-white border-primary animate__animated animate__fadeInDown"
              onClick={() => handleClick(ROUTE_MAP.medical_assessments)}
            />
            <Button
              text="Upcoming Inspections"
              styles="w-full bg-white text-primary border-primary border-[1px] animate__animated animate__fadeInDown"
              onClick={() =>
                handleClick(ROUTE_MAP.upcoming_medical_assessments)
              }
            />
            <Button
              text="Past Inspections"
              styles="w-full bg-white font-normal border-[1px] border-[#DBDBDB] text-[#535461] animate__animated animate__fadeInDown"
              onClick={() => handleClick(ROUTE_MAP.past_inspections)}
            />
            <Button
              text="Pending Inspections"
              styles="w-full bg-white font-normal border-[1px] border-red-300 text-red-300 animate__animated animate__fadeInDown"
              onClick={() => handleClick(ROUTE_MAP.pending_inspections)}
            />
          </div>
        </div>

        <div className="">
          <div className="flex flex-row gap-4">
            <div className="w-[50%] p-6 text-gray-600 text-center">
              <FontAwesomeIcon icon={faCircleQuestion} />
              &nbsp;Need help?
            </div>

            <div className="w-[50%] p-6 text-gray-600 text-center">
              <FontAwesomeIcon icon={faEllipsis} />
              &nbsp; More
            </div>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default MedicalAssessor;
