import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import authReducer from "./redurcers/authReducer";
import themeReducer from "./redurcers/themeReducer";
import usersReducer from "./redurcers/userReducer";
import rolesReducer from "./redurcers/roleReducer";
import departmentsReducer from "./redurcers/departmentReducer";
import employeesReducer from "./redurcers/employeeReducer";
import notificationsReducer from "./redurcers/notificationReducer";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    users: usersReducer,
    roles: rolesReducer,
    departments: departmentsReducer,
    employees: employeesReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  devTools: false,
});

export default store;
