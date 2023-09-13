import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import "./Header.css";

import { AiFillHome } from "react-icons/ai";

import ADMIN_ROUTE_MAP from "../routes/adminRouteMap";
import { getCookie } from "../utils";

export default function Nav() {
  return (
    <>
      <div className="h-[48px] bg-white drop-shadow-sm">
        <div className="container px-3 mx-auto">
          <div className="flex items-center h-[48px] py-2">
            <ul className="flex md nav-items text-gray-500 text-[14px] font-bold uppercase gap-4 justify-center align-center menus">
              <li className="flex bg-primary-800 rounded-md items-center justify-center h-8 w-8 hover:cursor-pointer">
                <NavLink to={ADMIN_ROUTE_MAP.adminModule.manageUsers.home}>
                  <AiFillHome className="text-white text-xl" />
                </NavLink>
              </li>
              {getCookie("regulator")[0]["role"] === "Super-Admin" && (
                <li className="flex hover:text-primary-600 hover:cursor-pointer">
                  <NavLink to={ADMIN_ROUTE_MAP.adminModule.manageUsers.home}>
                    Manage Users
                  </NavLink>
                </li>
              )}
              <li className="flex hover:text-primary-600 hover:cursor-pointer">
                <NavLink to={ADMIN_ROUTE_MAP.adminModule.manageForms.home}>
                  Manage Forms
                </NavLink>
              </li>
              <li className="flex hover:text-primary-600 hover:cursor-pointer">
                <NavLink to={ADMIN_ROUTE_MAP.adminModule.desktopAnalysis.home}>
                  Desktop Analysis
                </NavLink>
              </li>
              <li className="flex hover:text-primary-600 hover:cursor-pointer">
                <NavLink
                  to={ADMIN_ROUTE_MAP.adminModule.onGroundInspection.home}
                >
                  On Ground Inspection Analysis
                </NavLink>
              </li>
              <li className="flex hover:text-primary-600 hover:cursor-pointer">
                <NavLink
                  to={ADMIN_ROUTE_MAP.adminModule.certificateManagement.home}
                >
                  Certificates Issued
                </NavLink>
              </li>
              <li className="flex hover:text-primary-600 hover:cursor-pointer">
                <NavLink
                  to={ADMIN_ROUTE_MAP.adminModule.scheduleManagement.home}
                >
                  Schedule Management
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
