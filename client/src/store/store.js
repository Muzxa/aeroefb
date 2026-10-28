import { configureStore, createSlice } from "@reduxjs/toolkit";

const pilotSlice = createSlice({
  name: "pilot",
  initialState: { user: null },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
  },
});
export const { setUser } = pilotSlice.actions;
export const store = configureStore({ reducer: { pilot: pilotSlice.reducer } });
