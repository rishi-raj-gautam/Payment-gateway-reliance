require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY); // load from .env
const app = express();

app.use(cors());
app.use(express.json());



const FRONTEND_URL = 'https://reliancemove.com/wp-content/themes/your-theme/react-app';

app.post('/create-checkout-session', async (req, res) => {
    const booking = req.body;
    console.log("Creating Stripe session with price:", booking.price);
    console.log("Calculated unit amount:", Math.round(booking.price * 100));
    console.log("Booking response (backend): ", booking);
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'Moving Service',
                        description: `From ${booking.pickupAddress?.city} to ${booking.dropAddress?.city}`,
                    },
                    unit_amount: Math.round(booking.price * 100), // in pence
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/#/payment-failed`,
            metadata: {
                email: booking.email || 'NA',
                quoteRef: booking.quotationRef || 'NA',
                // bookingRef: booking.bookingRef || 'NA',
                username: booking.username,
                phoneNumber: booking.phoneNumber,

                // Pickup
                plocation: booking.pickupLocation.location || 'NA',
                pfloor: String(booking.pickupLocation.floor ?? '0'),
                plift: String(booking.pickupLocation.liftAvailable ?? false),
                ppropertyType: booking.pickupLocation.propertyType || 'standard',
                ppostcode: booking.pickupAddress.postcode || '',
                paddressLine1: booking.pickupAddress.addressLine1 || '',
                paddressLine2: booking.pickupAddress.addressLine2 || '',
                pcity: booking.pickupAddress.city || '',
                pcountry: booking.pickupAddress.country || '',
                pflatNo: booking.pickupAddress.flatNo || '',
                pcontactName: booking.pickupAddress.contactName || '',
                pcontactPhone: booking.pickupAddress.contactPhone || '',

                // Drop
                dlocation: booking.dropLocation.location || 'NA',
                dfloor: String(booking.dropLocation.floor ?? '0'),
                dlift: String(booking.dropLocation.liftAvailable ?? false),
                dpropertyType: booking.dropLocation.propertyType || 'standard',
                dpostcode: booking.dropAddress.postcode || '',
                daddressLine1: booking.dropAddress.addressLine1 || '',
                daddressLine2: booking.dropAddress.addressLine2 || '',
                dcity: booking.dropAddress.city || '',
                dcountry: booking.dropAddress.country || '',
                dflatNo: booking.dropAddress.flatNo || '',
                dcontactName: booking.dropAddress.contactName || '',
                dcontactPhone: booking.dropAddress.contactPhone || '',
                // Serialized arrays
                extraStops: JSON.stringify(booking.ExtraStopsArray || []),
                items: JSON.stringify(booking.itemsArray || []),

                // Journey and timing
                distance: String(booking.distance),
                duration: booking.duration || '',
                pickupDate: booking.pickupDate || '',
                pickupTime: booking.pickupTime || '',
                dropDate: booking.dropDate || '',
                dropTime: booking.dropTime || '',

                // Misc
                worker: String(booking.worker ?? 1),
                van: booking.vanType || '',
                price: String(booking.price ?? 0),
                itemsToDismantle: String(booking.itemsToDismantle ?? '0'),
                itemsToAssemble: String(booking.itemsToAssemble ?? '0'),
                isBusinessCustomer: String(booking.details.isBusinessCustomer ?? false),
                motorBike: booking.details.motorBike || '',
                piano: booking.details.piano || '',
                specialRequirements: booking.details.specialRequirements || '',

            }
            
        });
        console.log("metadata (backend): ", metadata);
        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('Stripe error details:', error.message);
        console.error('Stripe session creation failed:', error);
        res.status(500).json({ error: 'Unable to create Stripe session' });
    }
});

const PORT = 5000;
app.get('/checkout-session/:id', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.id);
        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Invalid session ID' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
