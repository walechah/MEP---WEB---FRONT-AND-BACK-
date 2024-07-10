// UserDetailsForm.tsx

'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import './UserDetailsforms.css';
import axios from 'axios';
import { StoreProvider } from '../StoreProvider';
import LandingHeader from "../components/LandingHeader/Header";
import UserDashboardHeader from "../components/UserDashboardHeader/Header";
import { auth } from "../firebase";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { app } from '../firebase';
import { useRouter } from 'next/router';
import OtpModal from '../components/OTP Modal/otpmodal'; // Import the OtpModal component

interface FormData {
  username: string;
  profilePicture: File | null;
  address: string;
  bloodGroup: string;
  height: string;
  weight: string;
  email: string;
  phone: string;
}

const loadAuthState = () => {
  try {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      return { authenticated: true, token: storedToken };
    } else {
      return { authenticated: false, token: '' };
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return { authenticated: false, token: '' };
  }
};

const HeaderComponent = () => {
  const [authState, setAuthState] = useState({ authenticated: false, token: '' });

  useEffect(() => {
    const state = loadAuthState();
    setAuthState(state);

    const handleBeforeUnload = () => {
      localStorage.removeItem('token');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthState({ authenticated: false, token: '' });
  };

  return (
    <div className="headercomp">
      {authState.authenticated ? <UserDashboardHeader /> : <LandingHeader />}
    </div>
  );
};

const UserDetailsForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    profilePicture: null,
    address: '',
    bloodGroup: '',
    height: '',
    weight: '',
    email: '',
    phone: ''
  });
  const [avatar, setAvatar] = useState<string>('/avataricon.png');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false); // State to manage modal visibility
  const auth = getAuth(app);

  useEffect(() => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      'size': 'invisible',
      'callback': (response) => {
        console.log('reCAPTCHA solved', response);
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }, [auth]);

  const handleSendOtp = async () => {
    try {
      const formattedPhoneNumber = `+${formData.phone.replace(/\D/g, '')}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhoneNumber, window.recaptchaVerifier)
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setOtp('');
      console.log('OTP sent, opening modal');
      setIsOtpModalOpen(true); // Open the OTP modal
      alert('OTP has been sent');
    } catch (error) {
      console.error(error);
    }
  }

  const handleOTPSubmit = async () => {
    try {
      await confirmationResult.confirm(otp);
      setOtp('');
      console.log('OTP verified, closing modal');
      setIsOtpModalOpen(false); // Close the OTP modal
    } catch (error) {
      console.error(error);
    }
  }

  const getData = async () => {
    try {
      const res = await axios.get('/api/usereditform', { params: { email: formData.email } });
      const userData = res.data;

      setFormData({
        username: userData.username || '',
        profilePicture: null,
        address: userData.address || '',
        bloodGroup: userData.blood_group || '',
        height: userData.height || '',
        weight: userData.weight || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });

      if (userData.profile_picture) {
        setAvatar(`/uploads/${userData.profile_picture}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (formData.email) {
      getData();
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.profilePicture) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setAvatar(e.target.result);
        }
      };
      reader.readAsDataURL(formData.profilePicture);
    }
  }, [formData.profilePicture]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        profilePicture: file
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otpSent) {
      alert('Please verify your phone number first.');
      return;
    }

    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('username', formData.username);
      formDataToSubmit.append('address', formData.address);
      formDataToSubmit.append('bloodGroup', formData.bloodGroup);
      formDataToSubmit.append('height', formData.height);
      formDataToSubmit.append('weight', formData.weight);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);

      if (formData.profilePicture instanceof File) {
        formDataToSubmit.append('profilePicture', formData.profilePicture);
      } else {
        console.error('Invalid profile picture');
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phonePattern = /^\d{10}$/;

      if (!emailPattern.test(formData.email)) {
        alert('Please enter a valid email address.');
        return;
      }

      if (!phonePattern.test(formData.phone)) {
        alert('Please enter a valid 10-digit phone number.');
        return;
      }

      const res = await axios.post('/api/usereditform', formDataToSubmit, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.status === 200) {
        alert('User details updated successfully');
      } else {
        console.error('Error updating user details', res.data.error);
      }
    } catch (error) {
      console.error('Error updating user details', error);
    }
  };

  return (
    <StoreProvider>
      <HeaderComponent />
      <div className="body">
        {
          !otpSent ? (<div id="recaptcha-container"></div>) : null
        }
        <form onSubmit={handleSubmit} className="user-details-form">
          <div className="profile-picture-container">
            <img src={avatar} alt="User Avatar" className="avatar" />
            <div className="greeting">
              Hello, {formData.username || 'User'}!
            </div>
          </div>
          <div className="form-fields">
            <div className="left-column">
              <div className="form-group">
                <label>
                  Username:
                  <input type="text" name="username" value={formData.username} onChange={handleChange} />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Profile Picture:
                  <input type="file" onChange={handleFileChange} />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Blood Group:
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </label>
              </div>
              <div className="form-group">
                <label>
                  Email:
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>
            </div>
            <div className="right-column">
              <div className="form-group">
                <label>
                  Height:
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    min="0"
                    step="any"
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Weight:
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    min="0"
                    step="any"
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="address">
                  Address:
                  <input
                    type="textbox"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Phone:
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                  />
                </label>
                <button type="button" onClick={handleSendOtp}>
                  Send OTP
                </button>
              </div>
            </div>
          </div>
          <button className='save-button' type="submit">Submit</button>
        </form>
        <OtpModal
          isOpen={isOtpModalOpen}
          otp={otp}
          setOtp={setOtp}
          handleOTPSubmit={handleOTPSubmit}
          closeModal={() => setIsOtpModalOpen(false)}
        />
      </div>
    </StoreProvider>
  );
};

export default UserDetailsForm;
