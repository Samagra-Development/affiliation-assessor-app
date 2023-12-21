import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import APPLICANT_ROUTE_MAP from "./routes/ApplicantRoute";

import Authenticate from "./login/Authenticate";
import ApplicantLogin from "./login/ApplicantLogin";
import LoginOTP from "./login/LoginOTP";
import Register from "./login/Register";

import Dashboard from "./pages/Dashboard";
import MyApplications from "./pages/MyApplications";
import AllApplications from "./pages/AllApplications";
import Congratulations from "./pages/Congratulation";
import PrivateRoute from "./routes/PrivateRoute";
import Profile from "./pages/Profile";
import CreateForm from "./pages/CreateForm";
import Toast from "./components/Toast";
import fireBaseApp, { getPermissionForToken } from "./config/firebase";
import { useEffect, useState } from "react";
import { getMessaging, onMessage } from "firebase/messaging";
import { getCookie } from "./utils";
import { getLocalTimeInISOFormat } from "./api";
import { applicantService } from "./services";
import Notification from "./pages/notifications/Notification";
import NotificationsDetailedView from "./pages/notifications/NotificationsDetailedView";
import PaymentResult from "./pages/PaymentResult";
import { ContextAPI } from "./utils/contextAPI";

function App() {
  const [toast, setToast] = useState({
    toastOpen: false,
    toastMsg: "",
    toastType: "",
  });

  const messaging = getMessaging(fireBaseApp);
  const onMessageListener = (async () => {
    const messagingResolve = await messaging;
    if (messagingResolve) {
      onMessage(messagingResolve, (payload) => {
        console.log(payload);
        setToast((prevState) => ({
          ...prevState,
          toastOpen: true,
          toastMsg: payload.data.title,
          toastType: "success"
        }));
      });
    }
  })();

  useEffect(() => {
    getPermissionForToken();
  }, []);

  useEffect(() => {
    if (toast) {
      setTimeout(() => {
        setToast({
          toastOpen: false,
          toastMsg: "",
          toastType: "",
        });
      }, 3000);
    }
  }, [toast]);

  return (
    <div className="App">
      <ContextAPI.Provider value={{setToast,toast}} >
        {toast.toastOpen && (
        <Toast toastMsg={toast.toastMsg} toastType={toast.toastType} />
      )}

      <BrowserRouter>
        <Routes>
          <Route path={APPLICANT_ROUTE_MAP.auth} element={<Authenticate />}>
            <Route
              path={APPLICANT_ROUTE_MAP.loginModule.login}
              element={<ApplicantLogin />}
            ></Route>
            <Route
              path={APPLICANT_ROUTE_MAP.loginModule.loginOTP}
              element={<LoginOTP />}
            ></Route>
          </Route>

          <Route path={APPLICANT_ROUTE_MAP.dashboard} element={<Dashboard />}>
            <Route
              path={APPLICANT_ROUTE_MAP.dashboardModule.register}
              element={<Register />}
            ></Route>
            <Route
              index
              path={APPLICANT_ROUTE_MAP.dashboardModule.my_applications}
              element={
                <PrivateRoute>
                  <MyApplications />
                </PrivateRoute>
              }
            ></Route>
            <Route
              path={`${APPLICANT_ROUTE_MAP.dashboardModule.all_applications}/:round?/:courseType?`}
             
              element={
                <PrivateRoute>
                  <AllApplications />
                </PrivateRoute>
              }
            ></Route>
            <Route
              path={`${APPLICANT_ROUTE_MAP.dashboardModule.createForm}/:formName/:formId?/:applicantStatus?/:paymentStage?`}
              element={
                <PrivateRoute>
                  <CreateForm />
                </PrivateRoute>
              }
            ></Route>
            <Route
              path={APPLICANT_ROUTE_MAP.dashboardModule.congratulations}
              element={
                <PrivateRoute>
                  <Congratulations />
                </PrivateRoute>
              }
            ></Route>
            <Route
              path={APPLICANT_ROUTE_MAP.dashboardModule.profile}
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            ></Route>
            <Route
              path={`${APPLICANT_ROUTE_MAP.dashboardModule.notifications}/:notificationId?`}
              element={
                <PrivateRoute>
                  <Notification />
                </PrivateRoute>
              }
            >
              <Route
                index
                element={
                  <PrivateRoute>
                    <NotificationsDetailedView />
                  </PrivateRoute>
                }
              ></Route>
            </Route>
          </Route>

          <Route
            path={APPLICANT_ROUTE_MAP.root_star}
            element={
              <PrivateRoute>
                <MyApplications />
              </PrivateRoute>
            }
          />
          <Route
            path={`${APPLICANT_ROUTE_MAP.dashboardModule.paymentResult}`}
            element={
              <PrivateRoute>
                <PaymentResult />
              </PrivateRoute>
            }
          />
          {/* Notifications routing starts here */}
        </Routes>
      </BrowserRouter></ContextAPI.Provider>
      
    </div>
  );
}

export default App;
