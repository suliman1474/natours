import axios from 'axios';
import { showAlert } from './alert';

const stripe = Stripe(
  'pk_test_51JSqBSFcA0Ho026dlWITsQ2Tp5TaNJ1a70ABIz9M6gu8pRNiwl3Y65xgxCGbJsDrtxnj1mWMMyy9H2nZGCWUgtGd00yrJdGCCl'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    //console.log(err);
    showAlert('error', err);
  }
};
