import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Label } from "../components";
import { FormCard } from "../components";
import { useForm } from "react-hook-form";

import { Select, Option } from "@material-tailwind/react";

import { FaAngleRight } from "react-icons/fa";
import { formService } from "../services";
import { getCookie } from "../utils";
import APPLICANT_ROUTE_MAP from "../routes/ApplicantRoute";

const AllApplications = () => {
  const [loadingForms, setLoadingForms] = useState(false);
  const [availableForms, setAvailableForms] = useState([]);
  const instituteDetails = getCookie("institutes");
  useEffect(() => {
    getAvailableForms();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const getAvailableForms = async () => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }
    setLoadingForms(true);
    const requestPayoad = {
      course_applied: instituteDetails[0].course_applied,
    };
    const formsResponse = await formService.getData(requestPayoad);
    if (formsResponse?.data?.courses) {
      setAvailableForms(formsResponse?.data?.courses);
    }
    setLoadingForms(false);
  };

  const applyFormHandler = () => {
    console.log("Apply Form clicked");
  };

  return (
    <>
      <div className="h-[48px] bg-white drop-shadow-sm">
        <div className="container mx-auto px-3 py-3">
          <div className="flex flex-row font-bold gap-2 items-center">
            <Link to={APPLICANT_ROUTE_MAP.dashboardModule.my_applications}>
              <span className="text-primary-400 cursor-pointer">
                My Application
              </span>
            </Link>
            <FaAngleRight className="text-[16px]" />
            <span className="text-gray-500">Available Forms</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-3 min-h-[40vh]">
        <div className="flex flex-col gap-4">
          <div className="flex mb-12 justify-between grid grid-cols-6 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-2 ">
              <Select className="bg-white" size="lg" label="Application type">
                <Option>New Institute</Option>
                <Option>New course in an existing institute</Option>
                <Option>Seat enhancement for an existing course</Option>
              </Select>
              {/* </div> */}
            </div>
            <div className="sm:col-span-2 ">
              <Select className="bg-white" size="lg" label="Course type">
                <Option>Nursing</Option>
                <Option>Paramedical</Option>
              </Select>
            </div>
            <div className="sm:col-span-2 ">
              <Select className="bg-white" size="lg" label="Course level">
                <Option>Degree</Option>
                <Option>Diploma</Option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xl font-semibold">Application forms</div>
            {!loadingForms && availableForms.length === 0 && (
              <div className="text-sm">There is no form available</div>
            )}
            {!loadingForms && availableForms.length > 0 && (
              <div className="text-sm">
                These are the available forms for you to apply. Click on any of
                them to start filling
              </div>
            )}
          </div>

          {!loadingForms && availableForms.length > 0 && (
            <div className="flex flex-wrap">
              {availableForms.map((form, index) => (
                <FormCard form={form} key={index} onApply={applyFormHandler} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AllApplications;
