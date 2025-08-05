/* // services/smsService.ts - Alternative CORS Proxy Solution

import axios from 'axios';

// Using a public CORS proxy (for development only)
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const SMS_BASE_URL = 'https://e-sms.dialog.lk/api/v1';

export const getAccessToken = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${CORS_PROXY}${SMS_BASE_URL}/auth/token`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    return response.data.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

export const sendSms = async (token: string, phone: string, message: string) => {
  try {
    const response = await axios.post(`${CORS_PROXY}${SMS_BASE_URL}/sms/send`, {
      msisdn: [phone],
      sourceAddress: "DP Communi",
      message: message,
      transaction_id: Date.now().toString()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

// Updated PayLaters component SMS section (replace the existing SMS code)
const handlePayment = async (e: React.FormEvent) => {
  // ... existing payment code ...

  // Send SMS notification
  try {
    const token = await getAccessToken("gayashanb", "2001@Dhananka");
    const message = `Dear ${selectedCustomer.Name},\n\nYour payment of LKR ${paymentAmount.toFixed(2)} has been successfully received on ${new Date().toLocaleDateString()}.\n\nYour new outstanding balance is LKR ${newCredit.toFixed(2)}.\n\nQuestions? Contact us at 0713856863.\n\nThanks for your business!\n\nBest regards,\nDP Communication\nThe Golden Mark Of Printing Art`;
    
    await sendSms(token, selectedCustomer.Phone.toString(), message);
    
    toast({
      title: "SMS Sent Successfully",
      description: "Payment confirmation sent to customer.",
    });
  } catch (smsError) {
    console.error("Failed to send SMS:", smsError);
    toast({
      title: "SMS Failed",
      description: "Could not send payment confirmation SMS.",
      variant: "destructive",
    });
  }
}; */