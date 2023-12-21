import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button, ApplicationCard, FormCard } from "../components";
import APPLICANT_ROUTE_MAP from "../routes/ApplicantRoute";
import { applicationService, formService } from "../services";
import { getCookie } from "../utils";
import { setToLocalForage } from "../forms";
import { Switch, Tooltip } from "@material-tailwind/react";
import { ContextAPI } from "../utils/contextAPI";


const MyApplications = () => {
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [switchDisabled, setSwitchDisabled] = useState(true);
  
  const [applications, setApplications] = useState([]);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedRound, setSelectedRound] = useState(1);
  const [courseType, setCourseType] = useState("");
  const { setToast } = useContext(ContextAPI);  const [draftApplications, setDraftApplications] = useState([]);

  
  const instituteDetails = getCookie("institutes");
  const navigate = useNavigate();

  useEffect(() => {
    getProfileDetails();
  }, []);


  useEffect(() => {
    setSelectedRound(1);
    getApplications();
    getDraftApplications();
    getAllAvailableForms(1);
  }, [courseType]);

  useEffect(() => {
    getAllAvailableForms(selectedRound);
  }, [selectedRound]);



  useEffect(() => {
    checkAvailableFormsToShow(selectedRound);
  }, [applications]);


  const getProfileDetails = () => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }
    console.log(instituteDetails[0].course_applied)
    setCourseType(instituteDetails[0].course_applied)
   /*  const instituteViewDetails = {
      institute_id: instituteData[0]?.id,
    };

    try {
      const response = await profileService.getProfileView(
        instituteViewDetails
      );

      const instituteDetails = response.data.institutes[0];
      console.log(instituteDetails)
    } catch (error) {
      setToast((prevState) => ({
        ...prevState,
        toastOpen: true,
        toastMsg: "Something went wrong.",
        toastType: "error",
      }));
      console.error("Can not see profile due to some error:", error);
    } */
  }

  const checkAvailableFormsToShow = async (roundSelected) => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }

    setLoadingApplications(true);
    
    //getAllAvailableForms(round)
    const requestPayload = {
      "round": roundSelected,
      "applicant_id": instituteDetails?.[0].id,
      "noc_path": true
      // NOTE:   "noc_path"=  true returns the forms for which
         //    no noc is generated for this applicant_id for given round 
    }
    const formsToOmitResp = await applicationService.formsToOmit(
      requestPayload
    );

    const formsToOmit = formsToOmitResp?.data?.form_submissions
    if (formsToOmitResp?.data?.form_submissions) {
      const courseIdsToOmit = [];
      for (let i = 0; i < formsToOmit.length; i++) {
        courseIdsToOmit.push(availableForms?.filter((el) => {
          if (el?.form.form_id === formsToOmit[i].course.form.form_id) {
            return el.course_id
          }
        }))
      }
      const unique = [...new Set(courseIdsToOmit.flat().map((item) => item?.course_id))];
      for (let i = 0; i < unique.length; i++) {
        setAvailableForms(availableForms?.filter(object => {
          return object?.course_id !== unique[i];
        }));
      }

     // setAvailableForms(rrr?.slice(0,4))
    }
    applications.forEach((item, index) => {
     // console.log(item)
      if (item.noc_Path !== null && item.round === 1) {
        setSwitchDisabled(false)
      } 
    });
    setLoadingApplications(false);
  }


  const getDraftApplications = async () => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }

    setLoadingApplications(true);
    const requestPayload = {
      "searchString": {
        "applicant_id": {
          _eq: instituteDetails?.[0].id || 11 
        }
      },
      offsetNo: 1,
      limit: 100
    }
    const draftApplicationResponse = await applicationService.getDraftForms(
      requestPayload
    );

  /*   applicationsResponse?.data?.form_submissions.forEach((item, index) => {
      console.log(item)
      if (item.form_id === 706) {
        item.noc_Path = "noc-path-isthere";
        item.noc_fileName = "noc-filename";
      }
    }); */

    if (draftApplicationResponse?.data?.institute_form_drafts) {
      setDraftApplications(draftApplicationResponse?.data?.institute_form_drafts);
    }
    console.log("draft Applications =>", draftApplicationResponse?.data?.institute_form_drafts);
    setLoadingApplications(false);
  };
  
  const getApplications = async () => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }

    setLoadingApplications(true);
    const requestPayload = {
       applicant_id: instituteDetails?.[0].id || 11 
      };
    const applicationsResponse = await applicationService.getData(
      requestPayload
    );

   /*  applicationsResponse?.data?.form_submissions.forEach((item, index) => {
      //console.log(item)
      if (item.form_id === 706) {
        item.noc_Path = "noc-path-isthere";
        item.noc_fileName = "noc-filename";
      }
    }); */

    if (applicationsResponse?.data?.form_submissions) {
      setApplications(applicationsResponse?.data?.form_submissions);
    }//arun
    setLoadingApplications(false);
  };

  const getAllAvailableForms = async (round) => {
    if (!instituteDetails || !instituteDetails?.length) {
      return;
    }

    setLoadingForms(true);
    const requestPayload = {
      condition: {
        _and: { form: {
          "form_status": {
            "_eq": "Published"
          }
        },
        "_and": {
          "course_type": {
            "_eq": courseType
          }
        } },
        assignee: { _eq: "applicant" },
      round: {
        _eq: round
      }
      },
    };

    const formsResponse = await formService.getData(requestPayload);
    if (formsResponse?.data?.courses) {
      const courses = formsResponse?.data?.courses
     /*  setAvailableForms((prevState) => ({
        ...prevState,
        courses
      })); */
      setAvailableForms(courses);
     // setAvailableForms(formsResponse?.data?.courses);
    }
    setLoadingForms(false);
  };

  const handleViewApplicationHandler = (formObj) => {
    navigate(
      `${APPLICANT_ROUTE_MAP.dashboardModule.viewForm}/${formObj?.form_name
      }/${formObj?.form_id}/${formObj.form_status?.toLowerCase()}`
    );
  };

  const handleApplyFormHandler = async (obj) => {
    await setToLocalForage("course_details", obj);
    let form_obj = obj?.formObject;
    if (typeof form_obj === "string") {
      form_obj = JSON.parse(form_obj);
    }
    let file_name = form_obj[0].name;
    file_name = file_name.substr(0, file_name.lastIndexOf("."));
    navigate(`${APPLICANT_ROUTE_MAP.dashboardModule.viewForm}/${file_name}`);
  };

  
  const handleToggleChange = (e) => {
  
  if(e.target.checked){
    getAllAvailableForms(2);
    setSelectedRound(2)
  } else {
    getAllAvailableForms(1)
    ;setSelectedRound(1);
  }
  };

  const navigateToAllApplications= () => {
    navigate(`${APPLICANT_ROUTE_MAP.dashboardModule.all_applications}/${selectedRound}/${courseType}`);
    
  };

  return (
    <>
      <div className="h-[48px] bg-white drop-shadow-sm">
        <div className="container mx-auto px-3 py-3">
          <div className="text-primary-400 font-bold">My Application</div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-3 min-h-[40vh]">
        <div className="flex flex-col gap-3">
          <div className="text-xl font-semibold">My Applications</div>
          {!loadingApplications && applications?.length === 0 && (
            <div className="text-sm">
              There is no active applications. Select one from the below list to
              apply.
            </div>
          )}
          {/** DRAFT APPLICATIONS */}
          {/* {!loadingApplications && draftApplications?.length > 0 && (
            <div className="flex flex-wrap">
              {draftApplications.map((application) => (
                <ApplicationCard
                  application={application}
                  key={application.form_id}
                  onView={handleViewApplicationHandler}
                />
              ))}
            </div>
          )} */}
          {!loadingApplications && applications?.length > 0 && (
            <div className="flex flex-wrap">
              {applications.map((application) => (
                <ApplicationCard
                  application={application}
                  key={application.form_id}
                  onView={handleViewApplicationHandler}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white drop-shadow-sm">
        <div className="container mx-auto px-3 py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-row">
              <div className="flex grow">
                <div className="flex flex-col gap-3">
                  <div className="text-xl font-semibold">Application forms</div>
              {    <Tooltip arrow content="Round 2 forms are only applicable for applicants who have received NOC for Round 1 forms">
                  <Switch
                    id="show-with-errors"
                    label={<span className="text-sm">Show Round 2 forms</span>}
                    onChange={handleToggleChange}
                    disabled={switchDisabled}
                  />
                  </Tooltip>}
                  
                  {!loadingForms && availableForms?.length === 0 && (
                    <div className="text-sm">There is no form available
                      <br />
                      These are the available forms for you to apply. Click on
                      any of them to start filling
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {!loadingForms && availableForms?.length > 0 && (
                   /*  <Link
                      to={
                        APPLICANT_ROUTE_MAP.dashboardModule.all_applications
                      }
                    > */
                      <Button
                        moreClass="text-primary-500 font-bold uppercase border-gray-500"
                        style={{
                          backgroundColor: "#fff",
                          border: "1px solid #d1d5db",
                        }}
                        text="See all"
                        onClick={() => navigateToAllApplications()}
                      ></Button>
                   /*  </Link> */
                )}
                  </div>
            </div>
              {!loadingForms && availableForms?.length > 0 && (
                <div className="flex flex-wrap">
                  
                  {availableForms.slice(0,4).map((form, index) => (
                    <FormCard
                      form={form}
                      key={index}
                      onApply={handleApplyFormHandler}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
      );
};

      export default MyApplications;
