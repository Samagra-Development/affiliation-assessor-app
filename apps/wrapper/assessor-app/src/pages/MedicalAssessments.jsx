import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ROUTE_MAP from "../routing/routeMap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faBuilding,
  faUser,
  faPhone,
  faLocationArrow,
} from "@fortawesome/free-solid-svg-icons";

import Button from "../components/Button";
import CommonLayout from "../components/CommonLayout";
import Loader from "../components/Loader";

import { getTodaysAssessment, getValidatedAssessor } from "../api";
import { StateContext } from "../App";
import {
  getCookie,
  getSpecificDataFromForage,
  setCookie,
  setToLocalForage,
} from "../utils";

const MedicalAssessments = () => {
  const { state, setState } = useContext(StateContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [role, setRole] = useState("");
  const [buttonText, setButtonText] = useState("Start Assessing");
  const [data, setData] = useState({
    district: "",
    instituteName: "",
    nursing: "",
    paramedical: "",
    type: "",
    latitude: null,
    longitude: null,
  });

  const handleStartAssessment = () => {
    setState({ ...state, todayAssessment: { ...data } });
    let obj = {
      todayAssessment: { ...data },
    };

    setToLocalForage("todayAssessment", obj);

    if (buttonText?.toLowerCase() === "continue") {
      navigate(ROUTE_MAP.assessment_type);
    } else {
      navigate(ROUTE_MAP.capture_location);
    }
  };

  function handleClick() {
    setButtonText("Continue");
  }

  const getTodayAssessments = async () => {
    setLoading(true);
    const storedData = await getSpecificDataFromForage("required_data");
    const assessor_user_id = storedData?.assessor_user_id;

    const postData = {
      date: new Date().toJSON().slice(0, 10),
      assessor_id: assessor_user_id,
      applicant_form_status: "Inspection Scheduled"
    };

    const res = await getTodaysAssessment(postData);
    if (res?.data?.assessment_schedule?.[0]) {
      let ass = res?.data?.assessment_schedule?.[0];
      setData({
        id: ass.institute.id,
        district: ass.institute.district,
        instituteName: ass.institute.name,
        specialization:
          ass.institute?.institute_specializations?.[0]?.specializations,
        courses: ass.institute?.institute_types?.[0]?.types,
        type: ass.institute.sector,
        pocs: ass.institute.institute_pocs,
        address: ass.institute.address,
        latitude: ass.institute.latitude,
        longitude: ass.institute.longitude,
      });

      const required_data = {
        institute_id: ass.institute.id,
        schedule_id: ass.id,
        applicant_form_id: ass.applicant_form_id,
      };

      setToLocalForage("required_data", required_data);
      const validateData = {
        assessor_id: assessor_user_id,
        institute_id: ass.institute.id,
      };
      const check = await getValidatedAssessor(validateData);
      if (check?.data.assessment_validation?.length > 0) {
        handleClick();
      }
    } else setData(null);

    setLoading(false);
  };

  const handleNavigate = () => {
    window.open(
      `https://maps.google.com/maps?q=${data.latitude},${data.longitude}&t=&z=13&ie=UTF8&iwloc=&output=embed`
    );
  };

  useEffect(() => {
    getTodayAssessments();
    // const {
    //   user: { registrations },
    // } = getCookie("userData");
    // const roles = registrations[0]?.roles[0];
    // setRole(roles);
  }, []);

  return (
    <CommonLayout
      back={ROUTE_MAP.root}
      logoutDisabled={isOnline ? false : true}
      pageTitle="Today's Inspection"
    >
      <div
        className={`flex flex-col px-6 h-3/4 overflow-y-scroll pb-6 ${
          !data?.id ? "justify-center" : ""
        }`}
      >
        {loading && <Loader></Loader>}
        {!loading && data && (
          <div className="flex flex-col bg-tertiary p-7 rounded-[8px] gap-3 animate__animated animate__fadeIn animate__slow">
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center">
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="text-1xl text-gray-600"
                />
                <div className="text-gray-500">Applicant name</div>
              </div>
              <div className="text-secondary text-[18px] font-medium">
                {data?.instituteName}
              </div>
            </div>
            <hr className="border-slate-300" />
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="text-1xl text-gray-600"
                />
                <div className="text-gray-500">District</div>
              </div>
              <div className="text-secondary text-[18px] font-medium">
                {data?.district}
              </div>
            </div>
            <hr className="border-slate-300" />
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center">
                <FontAwesomeIcon
                  icon={faUser}
                  className="text-1xl text-gray-600"
                />
                <div className="text-gray-500">POC Names</div>
              </div>
              {data?.pocs?.map((el, idx) => (
                <div
                  className="mt-[4px] text-secondary text-[18px] font-medium"
                  key={idx}
                >
                  {el.name}
                </div>
              ))}
            </div>
            <hr className="border-slate-300" />
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center">
                <FontAwesomeIcon
                  icon={faPhone}
                  className="text-1xl text-gray-600"
                />
                <div className="text-gray-500">POC Numbers</div>
              </div>
              <div className="flex flex-wrap">
                {data?.pocs?.map((el, idx) => (
                  <a href={`tel:${el.number}`} key={idx}>
                    <div className="flex flex-col p-2 m-[4px] bg-[#DBDBDB;] grow items-center rounded-[8px] gap-2">
                      <div className="rounded-[50%] w-[36px] h-[36px] bg-[#009A2B;] flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={faPhone}
                          className="text-1xl text-gray-600 text-white w-[16px]"
                        />
                      </div>
                      <div className="text-secondary text-[18px] font-medium">
                        {el.number}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <hr className="border-slate-300" />
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="text-1xl text-gray-600"
                />
                <div className="text-gray-500">Address</div>
              </div>
              <div className="flex flex-row gap-7">
                <div className="flex grow mt-[4px]">
                  <div className="text-secondary text-[18px] font-medium">
                    {data.address}
                  </div>
                </div>
                {data.latitude && data.longitude && (
                  <div
                    className="flex justify-center items-center"
                    onClick={handleNavigate}
                  >
                    <div className="flex grow-0 w-[60px] h-[60px] bg-[#DBDBDB;] justify-center items-center">
                      <FontAwesomeIcon
                        icon={faLocationArrow}
                        className="text-1xl text-gray-600 w-[24px] h-[24px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              text={buttonText}
              styles="border-primary text-white bg-primary"
              onClick={handleStartAssessment}
            />
          </div>
        )}
        {!loading && !data && (
          <div className="flex flex-col">
            <div className="w-full bg-tertiary p-7 rounded-[8px]">
              <div className="text-secondary text-[24px] text-center font-medium">
                No Assessments Today!
              </div>
            </div>
          </div>
        )}
      </div>
    </CommonLayout>
  );
};

export default MedicalAssessments;
