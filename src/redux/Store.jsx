import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import authReducer from "./redurcers/authReducer";
import themeReducer from "./redurcers/themeReducer";
import usersReducer from "./redurcers/userReducer";
import rolesReducer from "./redurcers/roleReducer";
import departmentsReducer from "./redurcers/departmentReducer";
import employeesReducer from "./redurcers/employeeReducer";
import assignmentsReducer from "./redurcers/assignmentReducer";
import warningsReducer from "./redurcers/warningReducer";
import jobTitlesReducer from "./redurcers/jobTitleReducer";
import notificationsReducer from "./redurcers/notificationReducer";
import auditReducer from "./redurcers/auditReducer";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    users: usersReducer,
    roles: rolesReducer,
    departments: departmentsReducer,
    employees: employeesReducer,
    assignments: assignmentsReducer,
    warnings: warningsReducer,
    jobTitles: jobTitlesReducer,
    notifications: notificationsReducer,
    audit: auditReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  devTools: false,
});

export default store;
