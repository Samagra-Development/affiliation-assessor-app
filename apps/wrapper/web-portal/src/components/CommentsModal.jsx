import React, { useEffect, useState, useContext } from 'react';
import { FaEye } from "react-icons/fa";
import { FiSend } from "react-icons/fi";
import {
    fetchAllComments,
    updateUserComments,
    addFirstUserComment
} from "../api";
import { ContextAPI } from "../utils/ContextAPI";


import { getCookie } from "../utils/common";
import { readableDate, formatDate, getInitials } from "../utils";
import { Tooltip } from "@material-tailwind/react";


function CommentsModal({ showCommentsModal, actionFunction, quesContent, actionButtonLabel, alertMsg, actionProps }) {
    const { setSpinner, setToast, toast } = useContext(ContextAPI);
    const [showCommentsSection, setShowCommentsSection] = useState(false);
    const hiddenFileInput = React.useRef(null);
    const [fileTypeError, setFileTypeError] = useState(false);
    const [fileName, setFileName] = useState("");
    const [file, setFile] = useState({});

    const [userComments, setUserComments] = useState('');
    const [ogaComments, setOgaComments] = useState('');
    const [loggedInRoleComments, setLoggedInRoleComments] = useState('');
    const [allRolesLoaded, setAllRolesLoaded] = useState(false);
    const [allComments, setAllComments] = useState([]);
    const [isFirstComment, setIsFirstComment] = useState(false);
    
    let commentsByRole = {}
    // isDATextAreaDisabled
let quesNumber = "3"

    const [commentTreeId, setCommentTreeId] = useState('');
    const [loggedInRole, setLoggedInRole] = useState('');

    const setApproveReject = (e) => {
        console.log("00000000000", e)
        e === "Approved" ? setShowCommentsSection(false) : setShowCommentsSection(true)
    };

    const handleChangeComments = (e) => {
        setUserComments(e.target.value)
    };

    const handleChangeAdminComments = (e) => {
      //  setAdminComments(e.target.value)
    };

    const handleChangeOGAComments = (e) => {
       // setOgaComments(e.target.value)
    };

    const handleButtonClick = (e) => {
        hiddenFileInput.current.click();
    };

    const postUserMessage= async (e) => {
        if(userComments){

            let reqBody = {}

           if(isFirstComment){
            reqBody = {
                commentTreeData: {
                    entityType: "AffiliationForm",
                    entityId: quesNumber,//ques id
                    workflow: "Affiliation"

                },
                commentData: {
                    comment: userComments,
                    file: [

                    ],
                    commentSource: {
                        userId: "NA",
                        userPic: "NA",
                        userName: `${getCookie("userData")?.firstName?.trim()} ${getCookie("userData")?.lastName?.trim()}`,
                        userRole:loggedInRole
                    }
                }
            }

           } else {
            reqBody = {
                commentTreeId: commentTreeId,
                   commentData: {
                    comment: userComments,
                    file: [
                       
                    ],
                    commentSource: {
                        userId: "NA",
                        userPic: "NA",
                        userName: `${getCookie("userData")?.firstName?.trim()} ${getCookie("userData")?.lastName?.trim()}`,
                        userRole: loggedInRole
                    }
                }
            }
           }

            try {
                let res; 
                isFirstComment ? res = await addFirstUserComment(reqBody): res= await updateUserComments(reqBody); 

                if(res?.status === 200){
                     getAllComments();
                     setUserComments('');
                     setIsFirstComment(false);
                }
            } catch (error) {
                console.log("updateUserComments failed ...", error)
                setToast((prevState) => ({
                    ...prevState,
                    toastOpen: true,
                    toastMsg: "Failed to post user comment.",
                    toastType: "error",
                }));
            }
            finally {
                setSpinner(false);
            }
          
           
           /*  try {
                setSpinner(true);
             
                const res = 
                if(res?.status === 200){
                     getAllComments();
                     setUserComments('');
                }
            } catch (error) {
                console.log("updateUserComments failed ...", error)
                setToast((prevState) => ({
                    ...prevState,
                    toastOpen: true,
                    toastMsg: "Failed to post user comment.",
                    toastType: "error",
                }));
            }
            finally {
                setSpinner(false);
            } */
           
        }
    };

    const handleChangeFileUpload = (e) => {
        const fileUploaded = e.target.files[0];
        if (!fileUploaded.name.includes(".pdf") || fileUploaded.size > 5000000) {
            setFileTypeError(true);
        } else {
            setFileName(
                fileUploaded?.name.substring(0, fileUploaded.name.lastIndexOf("."))
            );
            setFileTypeError(false);
            setFile(fileUploaded);
        }
    };

    const handleFile = (uploadFile) => {
        const formData = {
            file: uploadFile,
            quesNumber: 1,
        };

        //  getNocOrCertificatePdf(formData);
    };



    const getAllComments = async () => {
        let allRoles = []
        try {
            setSpinner(true);
            const res = await fetchAllComments(quesNumber);

            if (res?.data?.code === 'Not Found') {
                // first comment
                setIsFirstComment(true)
            } else 
            {
                setIsFirstComment(false);
                setCommentTreeId(res?.data?.commentTree?.commentTreeId)
                commentsByRole = res?.data?.comments?.reduce((acc, el) => {
                    const key = el?.commentData?.commentSource?.userRole;
                    (acc[key] = acc[key] || []).push(el);
                    // commentsByRole.push({key:acc[key]})
                    // console.log(acc)
                    return acc;
                }, {});

    
                allRoles = Object.keys(commentsByRole)
                const allCommentsArr = []
                const lastEntry = {}
                for (let i in allRoles) {
                    let commentsByRoleName = { roleName: "", comments: [] }
                    if(loggedInRole === allRoles[i].trim()){
                        lastEntry.roleName = allRoles[i].trim();
                        lastEntry.comments = commentsByRole[allRoles[i].trim()];
                    } else {
                       
                        commentsByRoleName.roleName = allRoles[i].trim()
                        commentsByRoleName.comments = commentsByRole[allRoles[i].trim()]
                        allCommentsArr.push(commentsByRoleName)
                    }
               
                }
                allCommentsArr.push(lastEntry)
                setAllComments(allCommentsArr)
            }

           
            setAllRolesLoaded(true)

            // Accessing value dynamically
            setLoggedInRoleComments(commentsByRole)

        } catch (error) {
            console.log("getAllComments failed ...", error)
            setToast((prevState) => ({
                ...prevState,
                toastOpen: true,
                toastMsg: "Failed to load user comments.",
                toastType: "error",
            }));
        }
        finally {
            setSpinner(false);
        }

        // getNocOrCertificatePdf(formData);
    };

    useEffect(() => {
        setLoggedInRole(getCookie("userData")?.attributes.Role[0])
      // setLoggedInRole("Desktop-Assessor")
     //  setLoggedInRole("POU")
        //getAllComments();
        //console.log(allRoles)
    }, []);

    useEffect(() => {

        if (loggedInRole) {
            getAllComments();
        }
    }, [loggedInRole]);


/*         useEffect(() => {
            console.log(allComments)
        }, [allRolesLoaded, allComments, loggedInRoleComments]); */

    return (
        <>
            <div className='flex justify-center items-center fixed inset-0 bg-opacity-25 z-10 backdrop-blur-sm '>
                <div className='overflow container mx-auto flex px-3  justify-between p-4 rounded-xl shadow-xl border border-gray-400 bg-white max-h-[calc(100vh-90px)] max-w-[600px]  '>
                    <div className='flex flex-col gap-4 min-w-[400px]'>
                        <span>{quesContent}</span>

                        <div className='min-w-[550px]'>

                            {allRolesLoaded && allComments?.map((elem,i) => (

                                <div key={i}>
                                         {/* console.log(elem) */}
                                    {loggedInRoleComments && elem?.comments?.map((item, index) => (

                                        <div className='m-3 mb-2 p-2 border border-grey-500 text-black font-medium rounded-[4px]'key={index}>

                                            <div className='flex flex-row gap-4 '>
                                                <Tooltip arrow content={item?.commentData?.commentSource?.userRole}>
                                                    <div className='flex h-[40px] w-[40px] rounded-full bg-pink-500 items-center m-2 justify-center'>
                                                        {getInitials(
                                                            `${item.commentData.commentSource.userRole.trim()}`
                                                        )}
                                                    </div>
                                                </Tooltip>

                                                <div className='flex flex-col'>
                                                    <div className='flex  m-1'>
                                                        <div>{item.commentData.commentSource.userName}</div>
                                                        <div className='ml-4 text-gray-700'>{readableDate(item.createdDate)}</div>
                                                    </div>
                                                    <div className='flex w-[430px] justify-between'>
                                                        <div className=''>
                                                            <p >{item.commentData.comment}</p>
                                                        </div>
                                                        <div >
                                                            { item.commentData.file.length !=0 &&
                                                                 (   <span className='flex flex-row gap-1 items-center cursor-pointer'><FaEye />{item.commentData.file}</span>
                                                                 )
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                    ))}
                                </div>
                            )
                            )
                            }
                        </div>


                        <div className='min-w-[550px]'>

                            {/*        {loggedInRole === "Assessor" &&
                                <div>
                                    <input className='justify-center'
                                        type="file"
                                        accept="application/pdf, .pdf"
                                        ref={hiddenFileInput}
                                        onChange={handleChangeFileUpload}
                                        style={{ display: "none" }}
                                    />


                                    <div className=' flex gap-4 justify-center '>
                                        <Button
                                            moreClass="text-white flex justify-center h-fit w-2/3 px-6"
                                            text="Browse file to upload(.pdf)"
                                            onClick={handleButtonClick}
                                        />{" "}
                                        <br />

                                    </div>
                                    {fileTypeError && (
                                        <div className=' flex gap-4 justify-center '>
                                            <div className="text-red-500">
                                                {"Only pdf files accepted  ( max size 5MB )"}
                                            </div>
                                        </div>

                                    )}

                                    <div className=' flex gap-4 justify-center '>
                                        <button
                                            onClick={() => {
                                                setFileName(""); setFile({})
                                            }}
                                            className="border border-blue-900 bg-white text-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleFile(file)}
                                            disabled={fileName && !fileTypeError ? false : true}
                                            // className="border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                            className={`${fileName && !fileTypeError
                                                ? "border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                                : "cursor-not-allowed border border-gray-500 bg-white text-gray-500 font-medium rounded-[4px] w-[140px]"
                                                }`}
                                        >
                                            {"Upload Proof"}
                                        </button>
                                    </div>

                                    <div className="mt-2 flex ml-2">{fileName}</div>
                                </div>
                            } */}
                            <div className='flex  gap-4 min-w-[300px]'>
                                <span>
                                    <textarea
                                        onChange={handleChangeComments}
                                        placeholder="Write here..."
                                        className="mt-2 ml-2 border w-[500px] h-[100px] p-2 rounded-xl resize-none"
                                        value={userComments}
                                        cols="30"
                                        rows="4"
                                    ></textarea>
                                </span>
                                <div className='flex items-center mt-2  '
                                onClick={postUserMessage}
                                > 
                                  <FiSend className='cursor-pointer  text-blue-400'
                                  size={28}
                                 />
                                </div>
                            </div>

                            {loggedInRole === "Desktop-Assessor" &&
                                <div
                                    onChange={(e) => setApproveReject(e.target.value)}
                                    className="py-2 px-1 ml-2 mt-2"
                                >
                                    <input type="radio"
                                        value="Approved" name="OGAResponse" /> Approve
                                    <input
                                        type="radio"
                                        value="Rejected"
                                        name="OGAResponse"
                                        className="ml-5"
                                    />{" "} Reject
                                </div>}
                        </div>

                        {/*     <div className='min-w-[550px]'>

                            {items?.map((item, index) => (

                                <p className='m-3 mb-2 p-2 border border-grey-500 text-white font-medium rounded-[4px]'>

                                    <div className='flex flex-row gap-4 '>
                                        <Tooltip arrow content={item.commentData.commentSource.userRole}>
                                            <div className='flex h-[40px] w-[40px] rounded-full bg-pink-500 items-center m-2 justify-center'>
                                                {getInitials(
                                                    `${item.commentData.commentSource.userRole.trim()}`
                                                )}
                                            </div>
                                        </Tooltip>

                                        <div className='flex flex-col'>
                                            <div className='flex  m-1'>
                                                <div>{item.commentData.commentSource.userName}</div>
                                                <div className='ml-4 text-gray-700'>{readableDate(item.createdDate)}</div>
                                            </div>
                                            <div className='flex w-[430px] justify-between'>
                                                <div className=''>
                                                    <p >{item.commentData.comment}</p>
                                                </div>
                                                <div >
                                                    <span className='flex flex-row gap-1 items-center cursor-pointer'><FaEye />{item.commentData.file}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </p>

                            ))}


                          

                            <textarea
                                onChange={handleChangeDAComments}
                                placeholder="Write here..."
                                className="mt-2 ml-2 border w-[530px] h-[100px] p-2 rounded-xl resize-none"
                                value={daComments}
                                cols="30"
                                rows="4"
                            ></textarea>

{
                                <div>
                                    <input className='justify-center'
                                        type="file"
                                        accept="application/pdf, .pdf"
                                        ref={hiddenFileInput}
                                        onChange={handleChangeFileUpload}
                                        style={{ display: "none" }}
                                    />


                                    <div className=' flex gap-4 justify-center m-4'>
                                        <Button
                                            moreClass="text-white flex justify-center h-fit w-2/3 px-6"
                                            text="Browse file to upload(.pdf)"
                                            onClick={handleButtonClick}
                                        />{" "}
                                        <br />

                                    </div>
                                    {fileTypeError && (
                                        <div className=' flex gap-4 justify-center '>
                                            <div className="text-red-500">
                                                {"Only pdf files accepted  ( max size 5MB )"}
                                            </div>
                                        </div>

                                    )}

                                    <div className=' flex gap-4 justify-center '>
                                        <button
                                            onClick={() => {
                                                setFileName(""); setFile({})
                                            }}
                                            className="border border-blue-900 bg-white text-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleFile(file)}
                                            disabled={fileName && !fileTypeError ? false : true}
                                            // className="border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                            className={`${fileName && !fileTypeError
                                                ? "border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                                : "cursor-not-allowed border border-gray-500 bg-white text-gray-500 font-medium rounded-[4px] w-[140px]"
                                                }`}
                                        >
                                            {"Upload Proof"}
                                        </button>
                                    </div>

                                    <div className="mt-2 flex ml-2">{fileName}</div>
                                </div>
                            }

                        </div> */}

                        <div className='mt-2 footer flex flex-row justify-between mb-2'>
                            <button onClick={() => { showCommentsModal(false) }} className="border border-blue-500 bg-white text-blue-500 w-[140px] h-[40px] font-medium rounded-[4px]">Cancel</button>
                            <button onClick={() => actionFunction(actionProps)} className={`border  w-[140px] h-[40px] font-medium rounded-[4px] ${actionButtonLabel === "Delete" ? "border-red-800 text-white bg-red-800" : "border-blue-500 text-white bg-blue-500"}`}>{actionButtonLabel}</button>
                        </div>
                    </div>
                </div>
            </div>


            {/* overflow:scroll reqd */}          {/*   <div className='flex justify-center items-center fixed inset-0 bg-opacity-25 z-10 backdrop-blur-sm '>
                <div className='container mx-auto flex px-3  justify-between p-4 rounded-xl shadow-xl border border-gray-400 bg-white min-h-[calc(100vh-90px)] max-w-[600px]  '>
                    <div className='flex flex-col gap-4 min-w-[400px]'>
                        <span>{quesContent}</span>
                        <div>
                            <div className='col-span-2 title flex font-bold'>
                                <h1>DA Comments  </h1>
                            </div>
                            <textarea
                                onChange={handleChangeDAComments}
                                placeholder="Write here"
                                className="ml-2 border w-[520px] h-[100px] p-2 rounded-xl resize-none"
                                disabled={isDATextAreaDisabled}
                                value={daComments} 
                                cols="30"
                                rows="4"
                            ></textarea>
                        </div>
                        <hr />
                        <div>
                            <div className='col-span-2 title flex font-bold'>
                                <h1>Admin Comments</h1>
                            </div>
                            <textarea
                                onChange={handleChangeAdminComments}
                                placeholder="Write here"
                                disabled={isAdminTextAreaDisabled}
                                className="ml-1 border w-[520px] h-[100px] p-2 rounded-xl resize-none"
                                value={adminComments} 
                                cols="30"
                                rows="4"
                            ></textarea>

                        </div>

                        <hr />
                        <div className='col-span-2 title flex font-bold'>
                                <h1>OGA Observations</h1>
                            </div>
                        {<div
                            onChange={(e) => setApproveReject(e.target.value)}
                            className="py-2 px-1"
                        >
                            <input type="radio"
                                value="Approved" name="OGAResponse" /> Approve
                            <input
                                type="radio"
                                value="Rejected"
                                name="OGAResponse"
                                className="ml-5"
                            />{" "} Reject
                        </div>}


                        <input className='justify-center'
                            type="file"
                            accept="application/pdf, .pdf"
                            ref={hiddenFileInput}
                            onChange={handleChangeFileUpload}
                            style={{ display: "none" }}
                        />
                     

                        <div className=' flex gap-4 justify-center '>
                            <Button
                                moreClass="text-white flex justify-center h-fit w-2/3 px-6"
                                text="Browse file to upload(.pdf)"
                                onClick={handleButtonClick}
                            />{" "}
                            <br />

                        </div>
                        {fileTypeError && (
                            <div className=' flex gap-4 justify-center '>
                                <div className="text-red-500">
                                    {"Only pdf files accepted  ( max size 5MB )"}
                                </div>
                            </div>

                        )}

                        <div className=' flex gap-4 justify-center '>
                            <button
                                onClick={() => {
                                    setFileName("");setFile({})
                                }}
                                className="border border-blue-900 bg-white text-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleFile(file)}
                                disabled={fileName && !fileTypeError ? false : true}
                                // className="border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                className={`${fileName && !fileTypeError
                                    ? "border border-blue-900 text-white bg-blue-900 w-[140px] h-[40px] font-medium rounded-[4px]"
                                    : "cursor-not-allowed border border-gray-500 bg-white text-gray-500 font-medium rounded-[4px] w-[140px]"
                                    }`}
                            >
                                {"Upload Proof"}
                            </button>
                        </div>

                        <div className="mt-2 flex ml-2">{fileName}</div>

                        {showCommentsSection &&
                            <div>
                                <div className='title flex font-bold'>
                                    <h1>OGA
                                        Comments</h1>
                                </div>
                                <div className='body flex justify-center'>
                                 <div className="body">
                                        <textarea
                                            disabled={isOGATextAreaDisabled}
                                            onChange={handleChangeOGAComments}
                                            placeholder="Write here"
                                            className="ml-2 border w-[520px] h-[100px] p-2 rounded-xl resize-none"
                                            value={ogaComments} 
                                            cols="30"
                                            rows="8"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        }
                        <hr />
                        <div className='footer flex flex-row justify-between'>
                            <button onClick={() => { showCommentsModal(false) }} className="border border-blue-500 bg-white text-blue-500 w-[140px] h-[40px] font-medium rounded-[4px]">Cancel</button>
                            <button onClick={() => actionFunction(actionProps)} className={`border  w-[140px] h-[40px] font-medium rounded-[4px] ${actionButtonLabel === "Delete" ? "border-red-800 text-white bg-red-800" : "border-blue-500 text-white bg-blue-500"}`}>{actionButtonLabel}</button>
                        </div>
                    </div>
                </div>
            </div> */}
        </>
    )
}

export default CommentsModal
