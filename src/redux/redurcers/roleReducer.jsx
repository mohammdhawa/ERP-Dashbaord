const initialState = {
  roles: [],
  fetchLoading: false,
  saving: false,
  error: null,
};

const rolesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ROLES_START":
      return { ...state, fetchLoading: true, error: null };
    case "FETCH_ROLES_SUCCESS":
      return { ...state, fetchLoading: false, roles: action.payload };
    case "FETCH_ROLES_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "SAVE_ROLE_START":
      return { ...state, saving: true, error: null };
    case "CREATE_ROLE_SUCCESS":
      return { ...state, saving: false, roles: [...state.roles, action.payload] };
    case "UPDATE_ROLE_SUCCESS":
      return {
        ...state,
        saving: false,
        roles: state.roles.map((role) =>
          role.id === action.payload.id ? action.payload : role
        ),
      };
    case "SAVE_ROLE_FAILURE":
      return { ...state, saving: false, error: action.payload };

    case "DELETE_ROLE_SUCCESS":
      return {
        ...state,
        roles: state.roles.filter((role) => role.id !== action.payload),
      };

    default:
      return state;
  }
};

export default rolesReducer;
