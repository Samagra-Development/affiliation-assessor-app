import React, { useEffect } from "react";
import { Card, Button } from "./index";
import { generate_uuidv4, getCookie, readableDate, removeCookie, setCookie } from "../utils";
import { applicantService } from "../services";
import paymentConfigPostData from '../payment-config/config.json';
const ApplicationCard = (props) => {
  let formName = props?.application?.course?.course_name?.trim() || "NA";

  const handlePayment = async () => {
    setCookie("formId", props?.application?.form_id);
    const refNo = generate_uuidv4()
    setCookie("payment_ref_no",refNo)
    const instituteDetails = getCookie("institutes");
    const instituteId = instituteDetails?.[0]?.id;
    /* const postData = {
      endpoint: "https://eazypayuat.icicibank.com/EazyPG",
      returnUrl: "https://payment.uphrh.in/api/v1/user/payment",
      paymode: "9",
      secret: "",
      merchantId: "600547",
      mandatoryFields: {
        referenceNo: refNo,
        submerchantId: "45",
        transactionAmount: "2500",
        invoiceId: "x1",
        invoiceDate: "x",
        invoiceTime: "x",
        merchantId: "x",
        payerType: "affiliation",
        payerId: `${instituteId}`,
        transactionId: "x",
        transactionDate: "x",
        transactionTime: "x",
        transactionStatus: "x",
        refundId: "x",
        refundDate: "x",
        refundTime: "x",
        refundStatus: "x",
      },
      optionalFields: "",
    }; */
    try {
      const paymentRes = await applicantService.initiatePayment(paymentConfigPostData);
      await applicantService.savePaymentRefNumber(paymentRes?.data?.referenceNo);
      await window.open(paymentRes?.data?.redirectUrl);
    } catch (error) {}
  };

  return (
    <Card moreClass="flex flex-col border-gray-100 m-3 gap-5 w-[360px] border-[1px] drop-shadow justify-between">
      <div className="flex flex-col gap-2">
        <div className="text-xl font-medium">{formName}</div>
        <div className="text-sm">
          Submitted on: {readableDate(props.application.submitted_on)}
        </div>
        <div className="flex flex-row gap-2 text-sm">
          <span
            className={`text-xs p-1 rounded-md ${
              props.application.form_status?.toLowerCase() === "in progress"
                ? "text-yellow-800"
                : props.application.form_status?.toLowerCase() === "resubmitted"
                ? "text-indigo-700"
                : props.application.form_status?.toLowerCase() ===
                  "inspection scheduled"
                ? "text-blue-400"
                : props.application.form_status?.toLowerCase() ===
                  "application submitted"
                ? "text-green-400"
                : props.application.form_status?.toLowerCase() === "returned"
                ? "text-red-400"
                : props.application.form_status?.toLowerCase() ===
                  "oga completed"
                ? "text-purple-400"
                : props.application.form_status?.toLowerCase() === "approved"
                ? "text-teal-400"
                : props.application.form_status?.toLowerCase() === "rejected"
                ? "text-pink-400"
                : "text-black-500"
            }`}
            style={{ backgroundColor: "#eee" }}
          >
            Status: {props.application.form_status}
          </span>
          <span
            className={`text-xs p-1 rounded-md ${
              props.application.payment_status?.toLowerCase() === "in progress"
                ? "text-yellow-800"
                : props.application.payment_status?.toLowerCase() ===
                  "resubmitted"
                ? "text-indigo-700"
                : props.application.payment_status?.toLowerCase() ===
                  "inspection scheduled"
                ? "text-blue-400"
                : props.application.payment_status?.toLowerCase() ===
                  "application submitted"
                ? "text-green-400"
                : props.application.payment_status?.toLowerCase() === "returned"
                ? "text-red-400"
                : props.application.payment_status?.toLowerCase() ===
                  "oga completed"
                ? "text-purple-400"
                : props.application.payment_status?.toLowerCase() === "approved"
                ? "text-teal-400"
                : props.application.payment_status?.toLowerCase() === "rejected"
                ? "text-pink-400"
                : "text-black-500"
            }`}
            style={{ backgroundColor: "#eee" }}
          >
            Payment: {props?.application?.payment_status !== null
              ? props?.application?.payment_status
              : "NA"}
          </span>
          <div>
            <span
              className={`text-xs py-1 px-2  rounded-md ${
                props.application.round === 1
                  ? "text-yellow-800"
                  : "text-indigo-700"
              }`}
              style={{ backgroundColor: "#eee" }}
            >
              Round: {props.application.round}
            </span> 
          </div>
        </div>
        <div>
          <span
              className={`text-xs py-1 px-2 rounded-md  ${
                props.application.round === 1
                  ? "text-yellow-800"
                  : "text-indigo-700"
              }`}
              style={{ backgroundColor: "#eee" }}
            >
            Course Applied: {props.application.institute.course_applied}
          </span>
        </div>
      </div>

      <div className="flex flex-row gap-2">
        <Button
          moreClass="text-primary-500 font-bold uppercase border-gray-500 text-primary-400"
          style={{ backgroundColor: "#fff" }}
          text="View Application "
          onClick={props.onView ? () => props.onView(props.application) : null}
        ></Button>
        <Button
          moreClass="w-fit text-white font-bold uppercase px-4"
          text="Pay"
          onClick={handlePayment}
          otherProps={{
            disabled: props?.application?.payment_status !== "Pending",
          }}
        ></Button>
      </div>
    </Card>
  );
};

export default ApplicationCard;
