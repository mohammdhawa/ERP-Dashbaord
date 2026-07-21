const initialState = {
  users: [],
  fetchLoading: false,
  saving: false,
  error: null,
};

const usersReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_USERS_START":
      return { ...state, fetchLoading: true, error: null };
    case "FETCH_USERS_SUCCESS":
      return { ...state, fetchLoading: false, users: action.payload };
    case "FETCH_USERS_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "SAVE_USER_START":
      return { ...state, saving: true, error: null };
    case "CREATE_USER_SUCCESS":
      return { ...state, saving: false, users: [...state.users, action.payload] };
    case "UPDATE_USER_SUCCESS":
      return {
        ...state,
        saving: false,
        users: state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        ),
      };
    case "SAVE_USER_FAILURE":
      return { ...state, saving: false, error: action.payload };

    case "DELETE_USER_SUCCESS":
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };

    default:
      return state;
  }
};

export default usersReducer;
