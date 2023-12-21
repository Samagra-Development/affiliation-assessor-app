import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import ROUTE_MAP from "../routing/routeMap";
import Webcam from "react-webcam";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

import CommonLayout from "../components/CommonLayout";
import Button from "../components/Button";

import { ConvertB64toFormData } from "./../utils/common";
import { UploadImage, ValidateAssessor } from "../api";
import { getSpecificDataFromForage } from "./../utils";

const videoConstraints = {
  aspectRatio: 0.8,
  facingMode: "user",
};

const CaptureSelfie = () => {
  let { lat, long } = useParams();
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [img, setImg] = useState(null);
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImg(imageSrc);
  }, [webcamRef]);

  const handlePostImage = async () => {
    const formDataToUpload = ConvertB64toFormData(img);

    try {
      const res = await UploadImage(formDataToUpload);
      if (res?.data?.fileURL) {
        postAssessorValidations(res?.data?.fileURL);
      } else {
        setError("Unable to upload image, contact Admin");
        setTimeout(() => {
          setError(false);
        }, 5000);
      }
    } catch (error) {
      console.debug(error)
    }
  };

  const postAssessorValidations = async (minioUrl) => {
    const storedObj = await getSpecificDataFromForage("required_data");

    const postData = {
      assessorUserId: storedObj.assessor_user_id,
      location: JSON.stringify({ lat, long }),
      selfieImageURL: minioUrl,
      schedule_id: storedObj.schedule_id,
    };

    try {
      const res = await ValidateAssessor(postData);
      if (res?.data?.insert_assessment_validation_one?.assessorUserId) {
        navigate(ROUTE_MAP.assessment_type);
      }
    } catch (error) {
      console.debug(error)
    }
  };

  useEffect(() => {}, []);

  return (
    <CommonLayout
      back={
        role == "Medical"
          ? ROUTE_MAP.assessment_type
          : ROUTE_MAP.medical_assessments
      }
      logoutDisabled
      iconType="close"
      pageTitle="2. Capture Selfie"
      pageDesc="Please ensure that all the assessors are getting captured in the selfie."
    >
      <div className="flex flex-col px-6 h-3/4 gap-5 pb-5 overflow-y-auto">
        {img === null && (
          <div className="flex flex-col w-full gap-5">
            <Webcam
              mirrored={true}
              height={320}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
            />
            <div
              className="flex justify-center items-center w-[72px] h-[72px] rounded-[50%] bg-primary border-primary mx-auto"
              onClick={handleCapture}
            >
              <FontAwesomeIcon
                icon={faCamera}
                className="text-white text-2xl"
              />
            </div>
          </div>
        )}

        {img && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <img src={img} alt="screenshot" className="h-[40vh] w-full" />
              <div className="text-center font-bold text-[#009A2B] text-[18px]">
                Selfie captured!
              </div>
              <div className="text-center break-words text-[#373839]">
                You have successfully captured your image and mark your
                attendance for the day by clicking on Continue.
              </div>

              {error && (
                <span className="text-white animate__animated animate__headShake bg-red-500 font-medium px-4 py-3 text-center mt-2">
                  {error}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <Button
                text={"Continue"}
                styles="border-primary text-white bg-primary"
                onClick={handlePostImage}
              ></Button>
              <Button
                text={"Re-capture photo"}
                styles="bg-white border-[#DBDBDB] border-1 text-[#535461] hover:text-[#535461]"
                onClick={() => setImg(null)}
              >
                Retake
              </Button>
            </div>
          </div>
        )}
      </div>
    </CommonLayout>
  );
};

export default CaptureSelfie;
