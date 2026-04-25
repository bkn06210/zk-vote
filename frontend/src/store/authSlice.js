import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,       // { email, role }
    isLoggedIn: false,
    isAdmin: false,
    loading: true,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.isLoggedIn = true;
        },
        setAdmin: (state, action) => {
            state.isAdmin = action.payload;
            state.loading = false;
        },
        clearUser: (state) => {
            state.user = null;
            state.isLoggedIn = false;
            state.isAdmin = false;
            state.loading = false;
        },
    },
});

export const { setUser, setAdmin, clearUser } = authSlice.actions;
export default authSlice.reducer;
