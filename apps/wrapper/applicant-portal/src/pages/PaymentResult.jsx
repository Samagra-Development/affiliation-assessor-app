import React, { useEffect, useContext } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../components";

import { AiFillCheckCircle } from "react-icons/ai";
import { RxCrossCircled } from "react-icons/rx";
import { FaAngleRight } from "react-icons/fa";

import APPLICANT_ROUTE_MAP from "../routes/ApplicantRoute";
import { getCookie, removeCookie } from "../utils";
import Header from "../components/Header";
import { applicantService } from "../services";
import {
  getFromLocalForage
} from "./../forms";


export default function PaymentResult() {
  let [params, setParams] = useSearchParams();
  const formId = getCookie("formId");
  const navigate = useNavigate();

  const goBack = () => {
    navigate(APPLICANT_ROUTE_MAP.dashboardModule.my_applications);
  };

  const applicantTransaction = async () => {
    if (params.get("transaction_id")) {
      const paymentRefNo = await applicantService.getPaymentRefNumber();
      const formData = {
        transaction_details: [
          { id: params.get("transaction_id"),
           form_id: formId,
           payment_ref_no: paymentRefNo
           }
        ],
      };
      const formsResponse = await applicantService.transactionStatus(formData);
      await applicantService.updatePaymentStatus({
        form_id: formId,
        payment_status: params.get("resp") === "success" ? "Paid" : "Failed",
      });
    }

    //email notify
    const emailData = {
      recipientEmail: [`${getCookie("userData")?.userRepresentation?.email}`],
      emailSubject: `Payment Details`,
      emailBody:
        params.get("transaction_amount") && params.get("transaction_id")
          ? `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Your Email Title</title><link href='https://fonts.googleapis.com/css2?family=Mulish:wght@400;600&display=swap' rel='stylesheet'></head><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;'><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 20px; text-align: center; background-color: #F5F5F5;'><img src='https://regulator.upsmfac.org/images/upsmf.png' alt='Logo' style='max-width: 360px;'></td></tr></table><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 36px;'><p style='color: #555555; font-size: 18px; font-family: 'Mulish', Arial, sans-serif;'>Dear ${
              getCookie("institutes")[0]?.name
            },</p>
      <p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>${
        params.get("resp") === "success" ? "Payment success" : "Payment failure"
      }</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Your payment details: </p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Transaction amount : <span>&#8377;</span> ${params.get(
              "transaction_amount"
            )}</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Tranction Id : ${params.get(
              "transaction_id"
            )}</p></td></tr></table></body></html>`
          : `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Your Email Title</title><link href='https://fonts.googleapis.com/css2?family=Mulish:wght@400;600&display=swap' rel='stylesheet'></head><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;'><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 20px; text-align: center; background-color: #F5F5F5;'><img src='https://regulator.upsmfac.org/images/upsmf.png' alt='Logo' style='max-width: 360px;'></td></tr></table><table width='100%' bgcolor='#ffffff' cellpadding='0' cellspacing='0' border='0'><tr><td style='padding: 36px;'><p style='color: #555555; font-size: 18px; font-family: 'Mulish', Arial, sans-serif;'>Dear ${
              getCookie("institutes")[0]?.name
            },</p>
      <p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>${
        params.get("resp") === "success" ? "Payment success" : "Payment failure"
      }</p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Your payment details: </p><p style='color: #555555; font-size: 18px; line-height: 1.6; font-family: 'Mulish', Arial, sans-serif;'>Reference No. : ${getCookie(
              "payment_ref_no"
            )}</p></td></tr></table></body></html>`,
    };

    applicantService.sendEmailNotification(emailData);
    removeCookie("payment_ref_no");
  };

  const getDataFromLocalForage = async () =>{
    const formDATA = await getFromLocalForage(
      `common_payload`
    );
    if (params.get("resp") && formDATA.paymentStage === "firstStage") {
      navigate(
        `${APPLICANT_ROUTE_MAP.dashboardModule.createForm}/${formDATA?.common_payload.form_name
        }/${undefined}/${undefined}/${formDATA?.paymentStage}`
      );
     
    } else if (params.get("resp"))  {
      applicantTransaction();
    }
  }

  useEffect(() => {

    getDataFromLocalForage();
    
   
    
  }, []);

  return (
    <>
      <Header />
      <div className="h-[48px] bg-white drop-shadow-sm">
        <div className="container mx-auto px-3 py-3">
          <div className="flex flex-row font-bold gap-2 items-center">
            <Link to={APPLICANT_ROUTE_MAP.dashboardModule.my_applications}>
              <span className="text-primary-400 cursor-pointer">
                All applications
              </span>
            </Link>
            <FaAngleRight className="text-[16px]" />
            <span className="text-gray-500">Payment result</span>
          </div>
        </div>
      </div>
      <div className="px-3 min-h-[40vh] py-8 container mx-auto">
        <div className="flex flex-col py-4">
          <h1 className="text-xl font-semibold">Payment</h1>
        </div>

        <div className="flex flex-col gap-1 text-center bg-white p-40">
          {params.get("resp") === "success" ? (
            <AiFillCheckCircle className="text-green-700 w-full text-6xl" />
          ) : (
            <RxCrossCircled className="text-red-700 w-full text-6xl" />
          )}

          <h2
            className={`${
              params.get("resp") === "success"
                ? "text-2xl font-semibold text-green-700 mb-4"
                : "text-2xl font-semibold text-red-700 mb-4"
            }`}
          >
            {params.get("resp") === "success"
              ? "Payment success"
              : "Payment failure"}
          </h2>
          <div className="flex flex-col gap-4">
            {params.get("transaction_amount") &&
              params.get("transaction_id") && (
                <>
                  <h2 className="text-xl font-semibold text-black">
                    Transaction amount : <span>&#8377;</span>{" "}
                    {params.get("transaction_amount")}
                  </h2>
                  <h2 className={"text-xl font-semibold text-black"}>
                    Tranction Id : {params.get("transaction_id")}
                  </h2>
                </>
              )}
            <div className="flex place-items-end mx-auto gap-4">
              <Button
                moreClass="px-6 text-primary-600"
                style={{ backgroundColor: "#fff" }}
                text="Back to home"
                onClick={goBack}
              ></Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
