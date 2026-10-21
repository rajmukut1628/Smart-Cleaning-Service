import mongoose from 'mongoose';
import Booking from './src/models/Booking';
import Service from './src/models/Service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const repairBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/project-bolt');
    
    // Find all bookings without populate to avoid schema errors
    const bookings = await Booking.find({});
    console.log(`Checking ${bookings.length} bookings...`);

    let updatedCount = 0;

    for (const booking of bookings) {
      // Manually find the service
      const service = await Service.findById(booking.service);
      if (!service) {
          console.warn(`Service not found for booking ${booking._id}`);
          continue;
      }

      const units = booking.squareFootage || booking.units || 0;
      let correctTotal = service.basePrice || 0;

      // Aggressive repair logic mirroring the new fix
      // If service is configured with units but not sqft, use unit price
      if (service.pricePerSqFt === 0 && (service as any).pricePerUnit > 0) {
        correctTotal += (units * ((service as any).pricePerUnit || 0));
        booking.unitType = 'unit'; // Repair the label too
      } else if (booking.unitType === 'square') {
        correctTotal += (units * (service.pricePerSqFt || 0));
      } else {
        correctTotal += (units * (service.pricePerUnit || 0));
      }

      // If current total is different from correct total, update it
      if (booking.totalAmount !== correctTotal) {
        console.log(`Updating Booking ${booking._id}: ${booking.totalAmount} -> ${correctTotal}`);
        booking.totalAmount = correctTotal;
        await booking.save();
        updatedCount++;
      }
    }

    console.log(`Successfully repaired ${updatedCount} bookings!`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Repair failed:', error);
  }
};

repairBookings();
