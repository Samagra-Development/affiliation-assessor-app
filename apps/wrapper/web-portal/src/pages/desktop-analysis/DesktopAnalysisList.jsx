import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Select, Option } from "@material-tailwind/react";

import FilteringTable from "../../components/table/FilteringTable";
import Nav from "../../components/Nav";
import { getCookie } from "../../utils";
import { ContextAPI } from "../../utils/ContextAPI";
import { Button } from "../../components";


import {
  filterDesktopAnalysis,
  getDesktopAnalysisForms,
  markReviewStatus,
  searchDesktop,
  getTransactionDetail,
  exportToExcel
} from "../../api";
import {
  readableDate,
  formatDate,
  getLocalTimeInISOFormat,
} from "../../utils/common";
import ADMIN_ROUTE_MAP from "../../routes/adminRouteMap";
import PaymentModal from "./PaymentModal";

const DesktopAnalysisList = () => {
  const navigation = useNavigate();
  var formsDataList = [];
  const [formsList, setFormsList] = useState();
  const [state, setState] = useState({
    menu_selected: "Application Submitted",
  });
  const [paginationInfo, setPaginationInfo] = useState({
    offsetNo: 0,
    limit: 10,
    totalCount: 0,
  });
  const loggedInUserRole = getCookie("userData").userRepresentation.attributes.Role[0];

  const [paymentModal, setPaymentModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { setSpinner, setToast } = useContext(ContextAPI);
  const [selectedRound, setSelectedRound] = useState(1);
  const [viewPaymentModal, setViewPaymentModal] = useState({
    flag: false,
    paymentDetails: {
      dateTime: getLocalTimeInISOFormat(),
      transactionId: "",
      amount: "",
      applicationType: "Institute",
      collegeName: "",
      paymentStatus: "",
    },
  });

  const COLUMNS = [
    {
      Header: "Form title",
      accessor: "form_title",
    },
    {
      Header: "Application type",
      accessor: "application_type",
    },
    {
      Header: "Course Name",
      accessor: "course_name",
    },
    {
      Header: "Date",
      accessor: "published_on",
    },
    {
      Header: "Status",
      accessor: "status",
    },
    // {
    //   Header: "Payment status",
    //   accessor: "payment_status",
    // },
    {
      Header: "",
      accessor: "schedule",
    },
  ];
  const REJECTEDCOLUMNS = [
    {
      Header: "Form title",
      accessor: "form_title",
    },
    {
      Header: "Application type",
      accessor: "application_type",
    },
    {
      Header: "Course Name",
      accessor: "course_name",
    },
    {
      Header: "Date",
      accessor: "reviewed_on",
    },
    {
      Header: "Status",
      accessor: "status",
    },
    // {
    //   Header: "Payment status",
    //   accessor: "payment_status",
    // },
    {
      Header: "",
      accessor: "schedule",
    },
  ]
  const NEWCOLUMNS = [
    {
      Header: "Form title",
      accessor: "form_title",
    },
    {
      Header: "Application type",
      accessor: "application_type",
    },
    {
      Header: "Course Type",
      accessor: "course_name",
    },
    {
      Header: "Date",
      accessor: "published_on",
    },
    {
      Header: "Status",
      accessor: "status",
    },
    {
      Header: "Payment status",
      accessor: "payment_status",
    },
    {
      Header: "",
      accessor: "schedule",
    },
  ];

  const cardArray = [
    {
      value: 0,
      key: "total_pending",
      text: "Total pending",
    },
    {
      value: 0,
      key: "submitted_today",
      text: "Received today",
    },
    {
      value: 0,
      key: "in_progress",
      text: "In progress",
    },
    {
      value: 0,
      key: "reviewed_today",
      text: "Reviewed today",
    },
    {
      value: 0,
      key: "reviewed_in_total",
      text: "Reviewed in total",
    },
  ];

  const handleSelectMenu = (menuItem) => {
    setState((prevState) => ({ ...prevState, menu_selected: menuItem }));
    setPaginationInfo((prevState) => ({ ...prevState, offsetNo: 0 }));
    setIsFilterOpen(false);
    setIsSearchOpen(false);
  };

  const navigateToView = (formObj) => {
    if (formObj?.form_name?.includes("applicant")) {
      formObj.form_name = formObj?.form_name?.replace("applicant", "admin");
    }

    const navigationURL = `${ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.viewForm}/${formObj?.form_name}/${formObj?.form_id}`;
    navigation(navigationURL);

    const postData = { form_id: formObj?.form_id };
    markStatus(postData);
  };

  const markStatus = async (postData) => {
    try {
      setSpinner(true);
      const res = await markReviewStatus(postData);
    } catch (error) {
      console.log("error - ", error);
    } finally {
      setSpinner(false);
    }
  };

  useEffect(() => {
    if (!isSearchOpen && !isFilterOpen) {
      fetchDesktopAnalysisForms();
    }
  }, [
    paginationInfo.offsetNo,
    paginationInfo.limit,
    selectedRound,
    state.menu_selected,
  ]);

  const fetchDesktopAnalysisForms = async () => {
    const postData = {
      offsetNo: paginationInfo.offsetNo,
      limit: paginationInfo.limit,
      round: selectedRound,
      formStatus: state.menu_selected,
    };
    try {
      setSpinner(true);
      const res = await getDesktopAnalysisForms(postData);
      setPaginationInfo((prevState) => ({
        ...prevState,
        totalCount: res.data.form_submissions_aggregate.aggregate.totalCount,
      }));
      console.log(res?.data?.form_submissions);
      setFormsList(res?.data?.form_submissions);
    } catch (error) {
      console.log("error - ", error);
    } finally {
      setSpinner(false);
    }
  };

  const searchApiCall = async (searchData) => {
    const postData = {
      offsetNo: paginationInfo.offsetNo,
      limit: paginationInfo.limit,
      round: selectedRound,
      ...searchData,
      formStatus: state.menu_selected,
    };
    try {
      setSpinner(true);
      const res = await searchDesktop(postData);
      setPaginationInfo((prevState) => ({
        ...prevState,
        totalCount: res.data.form_submissions_aggregate.aggregate.totalCount,
      }));
      setFormsList(res?.data?.form_submissions);
    } catch (error) {
      console.log("error - ", error);
    } finally {
      setSpinner(false);
    }
  };

  const handleViewSchedule = (data) => {
    // setScheduleUserData(data);
    setPaymentModal(true);
  };

  const filterApiCall = async (filters) => {
    let customFilters = {
      condition: {
        ...filters["condition"],
        round: {
          _eq: selectedRound,
        },
        form_status: {
          _eq: state.menu_selected,
        },
      },
    };
    const postData = {
      offsetNo: paginationInfo.offsetNo,
      limit: paginationInfo.limit,
      ...customFilters,
    };
    try {
      setSpinner(true);
      const res = await filterDesktopAnalysis(postData);
      setPaginationInfo((prevState) => ({
        ...prevState,
        totalCount: res.data.form_submissions_aggregate.aggregate.totalCount,
      }));
      setFormsList(res?.data?.form_submissions);
    } catch (error) {
      console.log("error - ", error);
    } finally {
      setSpinner(false);
    }
  };

  const status_obj = {
    total_pending: formsList?.length,
    submitted_today: 0,
    in_progress: 0,
    reviewed_today: 0,
    reviewed_in_total: 0,
  };

  const handleViewPayment = async (e) => {
    const transactionRes = await getTransactionDetail(
      e.transaction_details[0]?.id
    );
    setViewPaymentModal((prevState) => ({
      paymentDetails: {
        ...prevState.paymentDetails,
        dateTime: readableDate(transactionRes?.data?.transactionDate),
        transactionId: transactionRes?.data?.uniqueRefNumber,
        amount: transactionRes?.data?.totalAmount,
        collegeName: e.institute.name,
        paymentStatus: transactionRes?.data?.transaction_status,
      },
      flag: true,
    }));
  };

  const downloadReport = async () => {
    console.log("here")
    if (paginationInfo.totalCount > 0) {
      const postData = {
        formStatus: "DA Completed",
        offsetNo: 0,
        limit: paginationInfo.totalCount,
        round: selectedRound
      };
      try {
        setSpinner(true);
        const res = await getDesktopAnalysisForms(postData);
        // setFormsList(res?.data?.form_submissions);
        //console.log('DesktopAnalysisForms: ', res?.data?.form_submissions);
        const daCompletedFormsReport = {
          sheetName: 'report',
          downloadObject: [],
          headers: ['FORM ID','FORM TITLE',	'APPLICATION TYPE',	'COURSE TYPE','DATE',	'FORM STATUS'	,'PAYMENT STATUS','ASSESSOR ID']
          
        }
       
        res?.data?.form_submissions.forEach((element) => {
         
          if(element?.payment_status === "Paid"){
            const report = {
              form_id: element.form_id,
              form_title: element.course.course_name,
              application_type:  element.course.application_type || "-",
              course_type: element?.course_type || "-",
              date: element?.submitted_on || "-",
             // course_level: element?.course_level || "-",
              form_status: element?.form_status,
              payment_status: element?.payment_status || "-",
            }
            daCompletedFormsReport.downloadObject.push(report)
          }
        })
        const arr = daCompletedFormsReport.downloadObject
        daCompletedFormsReport.downloadObject = arr.sort((p1, p2) => (p1.date < p2.date) ? 1 : (p1.date > p2.date) ? -1 : 0);
       // const roundName = selectedRound === 1 ? 'Round One' : 'Round Two'
        const downloadObjects = {
          fileName: `${formatDate(new Date())}_DA_COMPLETED.xlsx`,
          objectsList: [daCompletedFormsReport]
        }
        exportToExcel(downloadObjects);
        setSpinner(false);
      } catch (error) {
        console.log("error - ", error);
        setSpinner(false);
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: "Failed to download excel file",
          toastType: "error",
        }));
      } 
    }
  }

  formsList?.forEach((e) => {
    //console.log("e =>", e);
    let applicationType = e?.course?.application_type?.replace("_", " ");
    var formsData = {
      form_title: (
        <div
          className={`px-6 text-primary-600 pl-0`}
          onClick={() => navigateToView(e)}
        >
          {e?.course?.course_name || "NA"}
        </div>
      ),
      file_name: e?.form_name,
      application_type:
        applicationType?.charAt(0).toUpperCase() +
        applicationType?.substring(1).toLowerCase(),
      course_name: `${e?.course_type} - ${e?.course_level}` || "NA",
      // course_name: `${e?.course?.course_type} - ${e?.course?.course_level}` || "NA",
      
      published_on: readableDate(e?.submitted_on),
      reviewed_on: readableDate(e?.reviewed_on),
      id: e.form_id,
      status: e?.form_status || "NA",
      payment_status: (
        <div
          className={`px-6 text-primary-600 pl-0`}
          onClick={
            e?.payment_status === "Paid" ? () => handleViewPayment(e) : () => { }
          }
        >
          {e?.payment_status === "Paid"
            ? "View Payment Detail"
            : e?.payment_status || "NA"}
        </div>
      ),
    };
    formsDataList.push(formsData);

    if (e.submitted_on === new Date().toJSON().slice(0, 10)) {
      status_obj.submitted_today++;
    }
    if (e.form_status === null) {
      status_obj.pending++; //red bg-red-500
    } else if (e.form_status?.toLowerCase() === "in progress") {
      //yellow bg-yellow-400
      status_obj.in_progress++;
    } else if (e.form_status?.toLowerCase() === "reviewed") {
      //green bg-green-400
      status_obj.reviewed++;
    }
  });

  cardArray.forEach((obj) => {
    obj.value = status_obj[obj.key];
  });

  return (
    <>
      <Nav />
      <div
        className={`container ; m-auto min-h-[calc(100vh-148px)] px-3 py-12`}
      >
        <div className="flex flex-col gap-8">
          {/* <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-medium">Your activity</h1>
            </div>
            <div className="flex flex-wrap">
              {cardArray.map((obj, index) => (
                <Card
                  moreClass="shadow-md w-[200px] h-[100px] m-3 first:ml-0"
                  key={index}
                >
                  <div className="flex flex-col place-items-start justify-center gap-2">
                    <h3 className="text-xl font-semibold">{obj.value}</h3>
                    <div className="text-sm font-medium text-gray-700">
                      {obj.text}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div> */}

          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-semibold">All Applications</h1>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <div className="w-72 bg-white rounded-[8px]">
                  <Select
                    value={selectedRound}
                    label="Select round"
                    onChange={(value) => {
                      setSelectedRound(value);
                      setPaginationInfo((prevState) => ({
                        ...prevState,
                        offsetNo: 0,
                      }));
                      setIsFilterOpen(false);
                      setIsSearchOpen(false);
                    }}
                  >
                    <Option value={1}>Round one</Option>
                    <Option value={2}>Round two</Option>
                  </Select>
                </div>
              </div>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button
                onClick={() => {
                  downloadReport();
                }}
                moreClass="border boevent_namerder-blue-500 bg-white text-blue-500 "
                text="Download DA Completed forms as excel file"
              ></Button>
              </div>
          </div>

          <div className="flex flex-col gap-4">
            <ul className="flex flex-wrap gap-3 -mb-px">
              <li
                className=""
                onClick={() => handleSelectMenu("Application Submitted")}
              >
                <a
                  href="#"
                  className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${
                    state.menu_selected === "Application Submitted"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : ""
                  }`}
                >
                  New Forms Submitted
                </a>
              </li>
              <li className="" onClick={() => handleSelectMenu("Returned")}>
                <a
                  href="#"
                  className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${
                    state.menu_selected === "Returned"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : ""
                  }`}
                >
                  Returned to institute
                </a>
              </li>
              <li className="" onClick={() => handleSelectMenu("Resubmitted")}>
                <a
                  href="#"
                  className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${
                    state.menu_selected === "Resubmitted"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : ""
                  }`}
                >
                  Resubmitted for DA
                </a>
              </li>
              <li className="" onClick={() => handleSelectMenu("DA Completed")}>
                <a
                  href="#"
                  className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${
                    state.menu_selected === "DA Completed"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : ""
                  }`}
                  aria-current="page"
                >
                  DA Completed
                </a>
              </li>
            
              {loggedInUserRole !== "Desktop-Assessor" && (
                < li
                  className=""
                  onClick={() => handleSelectMenu("Inspection Scheduled")}
                >
                  <a
                    href="#"
                    className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${state.menu_selected === "Inspection Scheduled"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : ""
                      }`}
                  >
                    On-ground Inspection Scheduled
                  </a>
                </li>
              )}
              <li className="" onClick={() => handleSelectMenu("Rejected")}>
                <a
                  href="#"
                  className={`inline-block p-4 rounded-t-lg dark:text-blue-500 dark:border-blue-600 ${
                    state.menu_selected === "Rejected"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : ""
                  }`}
                  aria-current="page"
                >
                  Application Rejected
                </a>
              </li>{" "}
            
             
            </ul>

            {/* table creation starts here */}
            <div className="flex flex-col gap-4">
              {state.menu_selected === "Application Submitted" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={COLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
              {state.menu_selected === "Resubmitted" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={COLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
              {state.menu_selected === "Inspection Scheduled" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={COLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
              {state.menu_selected === "Rejected" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={REJECTEDCOLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
              {state.menu_selected === "DA Completed" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={NEWCOLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
              {state.menu_selected === "Returned" && (
                <FilteringTable
                  dataList={formsDataList}
                  // navigateFunc={navigateToView}
                  navigateFunc={() => { }}
                  columns={COLUMNS}
                  pagination={true}
                  onRowSelect={() => { }}
                  filterApiCall={filterApiCall}
                  showFilter={true}
                  showSearch={true}
                  paginationInfo={paginationInfo}
                  setPaginationInfo={setPaginationInfo}
                  searchApiCall={searchApiCall}
                  setIsSearchOpen={setIsSearchOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  selectedRound={selectedRound}
                />
              )}
            </div>
          </div>
        </div>
        {viewPaymentModal.flag && (
          <PaymentModal
            modalDetails={viewPaymentModal}
            setViewPaymentModal={setViewPaymentModal}
          />
        )}
      </div>
      {paymentModal && (
        <PaymentModal
          closeViewSchedulesModal={setPaymentModal}
        // scheduleUserData={scheduleUserData}
        ></PaymentModal>
      )}
    </>
  );
};
export default DesktopAnalysisList;