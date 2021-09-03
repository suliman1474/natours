/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';
export const signup = async (name, email, password, confirmPassword) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm: confirmPassword
      }
    });

    console.log(res);
    if (res.data.status === 'success') {
      showAlert('success', 'Signed Up Succesfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
