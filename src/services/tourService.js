const mongoose = require("mongoose");
const { Tour } = require("../models/tourSchema");
const { Rating } = require("../models/ratingSchema");

class TourService {
  // tourData = dữ liệu tour mới
  // authorId = id của người tạo tour
  static async createTour(tourData, userId) {
    const newTour = new Tour({
      ...tourData,
      guideId: new mongoose.Types.ObjectId(userId),
    });
    // userId trong schema

    return await newTour.save();
  }
  static async getallTours({
    city,
    rating,
    category,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    page,
    limit,
    search,
    minDuration,
    maxDuration,
  }) {
    // trả thêm một vài thông tin về tourguide (chưa làm, xem xét)
    const query = { isActive: true };
    // search
    // city object
    // category array
    // minPrice
    // maxPrice
    // sortBy - asc/desc
    //sortOrder - newest/oldest
    //minDuration
    //maxDuration
    // xem xet bo limit
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { "location.city": regex },
        { "location.address": regex },
        { "location.placeId": regex },
      ];
    }
    if (city) {
      query["location.city"] = new RegExp(city, "i");
    }
    if (category) {
      // nếu ko phải là array thì chuyển thành array
      const categories = Array.isArray(category) ? category : [category];
      query.category = { $in: categories };
    }
    // viết 2 minprice và maxprice tách ra sẽ khiến overide
    //If both minPrice and maxPrice are provided:
    //The second if (maxPrice) overwrites the first one.
    // Final query will only be: { pricing: { $lte: maxPrice } }
    if (minPrice || maxPrice) {
      query.pricing = {};
      if (minPrice) query.pricing.$gte = Number(minPrice);
      if (maxPrice) query.pricing.$lte = Number(maxPrice);
    }
    if (minDuration || maxDuration) {
      query.durationMinutes = {};
      if (minDuration) query.durationMinutes.$gte = parseInt(minDuration);
      if (maxDuration) query.durationMinutes.$lte = parseInt(maxDuration);
    }
    if (rating) {
      query["rating.count"] = { $gte: Number(rating) };
    }

    //Sorting
    //?sortBy=pricing&sortOrder=desc&page=1&limit=10
    const allowedSortFields = ["pricing", "bookingCount", "createdAt"];
    const sort = {};
    if (sortBy && allowedSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const pageNum = Math.max(1, Number(page) || 1); // Ensure page is at least 1
    const limitNum = Math.min(Number(limit) || 9, 50); // Cap limit to prevent abuse

    // Execute query
    const [tours, total] = await Promise.all([
      // excute concurrent  Tour.find(query) and  Tour.countDocuments(query) => promise
      Tour.find(query).sort(sort).skip(skip).limit(limitNum).lean(), // Use lean() for better performance
      Tour.countDocuments(query), // Get total count for pagination
    ]);

    return {
      tours,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
  catch(error) {
    throw new Error(`Failed to fetch tours: ${error.message}`);
  }

  static async rateTour({ userId, tourId, count, text }) {
    try {
      if (!mongoose.Types.ObjectId.isValid(tourId)) {
        throw new Error("Invalid tour ID");
      }

      // Kiểm tra xem người dùng đã đánh giá tour này chưa
      const existing = await Rating.findOne({ userId, tourId });
      if (existing) {
        throw new Error("You have already rated this tour");
      }

      // Tạo đánh giá mới
      const rating = new Rating({
        userId,
        tourId,
        count,
        text,
      });

      await rating.save();

      // cập nhật averageRating
      await TourService.updateAverageRating(tourId);

      // Thêm vào tour
      await Tour.findByIdAndUpdate(tourId, {
        $push: { rating: rating._id },
      });

      return rating;
    } catch (error) {
      throw new Error(`Failed to rate tour: ${error.message}`);
    }
  }

  static async updateAverageRating(tourId) {
    try {
      const ratings = await Rating.find({ tourId });

      if (ratings.length === 0) {
        // Không có đánh giá nào, cập nhật về 0 hoặc null
        await Tour.findByIdAndUpdate(tourId, { averageRating: 0 });
        return;
      }

      let sum = 0;

      for (let i = 0; i < ratings.length; i++) {
        sum += ratings[i].count;
      }
      const average = sum / ratings.length;

      await Tour.findByIdAndUpdate(tourId, { averageRating: average });
    } catch (error) {
      throw new Error(`Failed to update average rating: ${error.message}`);
    }
  }

  static async getTourById(tourId) {
    try {
      if (!tourId) {
        throw new Error("Tour ID is required");
      }
      const tour = await Tour.findById(tourId)
        .populate({
          path: "guideId",
          select:
            "profileInfo.firstName profileInfo.lastName profileInfo.profilePhoto profileInfo.city guideInfo.professionalTitle guideInfo.languages",
        })

        .populate({
          path: "rating",
          populate: {
            path: "userId",
            select: "profileInfo.firstName profileInfo.lastName",
          },
        });
      if (tour && tour.availability) {
        tour.availability = TourService.filterFutureAvailability(
          tour.availability
        );
      }

      //khi người dùng chọn tour thì ngoài thông tin về tour thì người ta cũng có thể thấy một số thông tin về tourguide
      return tour;
    } catch (error) {
      throw new Error(`Failed to fetch tour by ID: ${error.message}`);
    }
  }

  static filterFutureAvailability(availability) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time to compare only dates

    return availability.filter((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0); // Normalize slot date
      return slotDate >= today;
    });
  }

  static async updateTour(data, tourId, userId) {
    try {
      // Validate tourId
      if (!mongoose.Types.ObjectId.isValid(tourId)) {
        throw new Error("Invalid tour ID");
      }
      const updateData = data;

      const updatedTour = await Tour.findOneAndUpdate(
        { _id: tourId, guideId: new mongoose.Types.ObjectId(userId) },
        { $set: updateData },
        { new: true, runValidators: true } // Run schema validators
      );

      if (!updatedTour) {
        throw new Error("Tour not found or user not authorized");
      }

      return updatedTour;
    } catch (error) {
      throw new Error(`Failed to update tour: ${error.message}`);
    }
  }

  static async deleteTour(tourId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(tourId)) {
        throw new Error("Invalid tour ID");
      }

      // First fetch the tour to check if it's booked
      const tour = await Tour.findOne({
        _id: tourId,
        guideId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      });

      if (!tour) {
        throw new Error("Tour not found or user not authorized");
      }

      const isBooked = tour.availability.some((slot) => slot.isBooked);
      if (isBooked) {
        throw new Error("Cannot delete tour that is currently booked");
      }

      const deletedTour = await Tour.findOneAndUpdate(
        {
          _id: tourId,
          guideId: new mongoose.Types.ObjectId(userId),
          isActive: true,
        },
        {
          isActive: false,
          deletedAt: new Date(), // Set timestamp here
        },
        { new: true }
      );

      if (!deletedTour) {
        throw new Error("Tour not found or user not authorized");
      }

      return deletedTour;
    } catch (error) {
      throw new Error(`Failed to delete tour: ${error.message}`);
    }
  }

  static async restoreTour(tourId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(tourId)) {
        throw new Error("Invalid tour ID");
      }

      const restoredTour = await Tour.findOneAndUpdate(
        {
          _id: tourId,
          guideId: new mongoose.Types.ObjectId(userId),
          isActive: false,
        },
        {
          isActive: true,
          deletedAt: null, // Clear timestamp on restore
        },
        { new: true }
      );

      if (!restoredTour) {
        throw new Error("Tour not found or user not authorized to restore");
      }

      return restoredTour;
    } catch (error) {
      throw new Error(`Failed to restore tour: ${error.message}`);
    }
  }

  static async getDeletedTours() {
    return await Tour.find({ isActive: false }).sort({ deletedAt: -1 }).lean();
  }

  static async getTourPhotoById(tourId, photoId) {
    try {
      const tour = await Tour.findById(tourId);
      if (!tour) {
        throw new Error("Tour not found");
      }

      // Tìm ảnh theo tên
      const photo = tour.images.find((img) => img === photoId);
      if (!photo) {
        throw new Error("Photo not found");
      }

      // Trả về path ảnh
      return photo; // trả về tên ảnh, controller sẽ xử lý trả file
    } catch (err) {
      console.error("Error seeing photo:", err);
      throw err;
    }
  }

  static async highlightTour() {
    const highlightTours = await Tour.aggregate([
      { $match: { isActive: true } }, // Chỉ lấy tour đang active
      {
        $addFields: {
          bookedDays: {
            $size: {
              $filter: {
                input: "$availability", // Mảng availability
                as: "day", // Biến tạm đại diện cho từng phần tử
                cond: { $eq: ["$$day.isBooked", true] }, // Lọc những ngày đã được đặt
              },
            },
          },
        },
      },
      { $sort: { bookedDays: -1 } }, // Sắp xếp giảm dần theo số ngày được đặt
      { $limit: 4 }, // Chỉ lấy 5 tour nhiều booking nhất
    ]);

    return highlightTours;
  }

  static async highlightCity() {
    const highlightCity = await Tour.aggregate([
      {
        $match: { isActive: true }, // Chỉ lấy tour đang active
      },
      {
        $addFields: {
          bookedDays: {
            $size: {
              $filter: {
                input: "$availability", // Mảng availability
                as: "day", // Biến tạm đại diện cho từng phần tử
                cond: { $eq: ["$$day.isBooked", true] }, // Lọc những ngày đã được đặt
              },
            },
          },
        },
      },
      // Bước 1: Sắp xếp theo bookedDays giảm dần
      {
        $sort: { bookedDays: -1 },
      },
      {
        $group: {
          _id: "$location.city", // Nhóm theo city
          totalBookings: { $sum: "$bookedDays" }, // Tổng lượt book
          tourCount: { $sum: 1 }, // Số tour trong thành phố
          samplePhoto: { $first: "$images" }, // lấy ảnh đầu tiên từ tour đầu tiên
        },
      },
      {
        $project: {
          _id: 1,
          totalBookings: 1,
          tourCount: 1,
          samplePhoto: { $arrayElemAt: ["$samplePhoto", 0] }, // lấy ảnh đầu tiên trong mảng photos
        },
      },
      // Bước 2: Sắp xếp giảm dần theo totalBookings
      {
        $sort: { totalBookings: -1 },
      },
      // Bước 3: Giới hạn số thành phố trả về
      {
        $limit: 4, // Chỉ lấy 4 thành phố nhiều booking nhất
      },
    ]);

    return highlightCity;
  }

  static async searchAutoComplete(search) {
    const searchAutoComplete = await Tour.aggregate([
      {
        $search: {
          index: "default",
          compound: {
            should: [
              {
                autocomplete: {
                  query: search,
                  path: "title",
                },
              },
              {
                autocomplete: {
                  query: search,
                  path: "location.city",
                },
              },
            ],
          },
        },
      },
      {
        $project: {
          title: 1,
          location: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $limit: 5 },
    ]);
    return searchAutoComplete;
  }

  static async getTourByGuideId(guideId) {
    try {
      if (!guideId) {
        throw new Error("GuideId is unavailable");
      }
      const tours = await Tour.find({ guideId });

      return tours;
    } catch (error) {
      throw new Error(`Failed to fetch tour by guide ID: ${error.message}`);
    }
  }

  static async getTourByGuideIdWithPagination(guideId, page = 1, limit = 4) {
    try {
      if (!guideId) {
        throw new Error("GuideId is unavailable");
      }

      const skip = (page - 1) * limit;
      const query = { 
        guideId,
        isActive: true 
      };

      // Execute queries in parallel for better performance
      const [tours, total] = await Promise.all([
        Tour.find(query)
          .populate({
            path: "rating",
            populate: {
              path: "userId",
              select: "profileInfo.firstName profileInfo.lastName",
            },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Tour.countDocuments(query)
      ]);

      // Calculate average rating and total reviews for each tour
      const toursWithStats = tours.map(tour => {
        const ratings = tour.rating || [];
        const totalReviews = ratings.length;
        const averageRating = totalReviews > 0 
          ? ratings.reduce((sum, rating) => sum + rating.count, 0) / totalReviews 
          : 0;

        return {
          ...tour,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          totalReviews
        };
      });

      return {
        tours: toursWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
          nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch paginated tours by guide ID: ${error.message}`);
    }
  }
  
  static async findTourToCompare(tourId) {
    try {
      if (!tourId) {
        throw new Error("Tour ID is required");
      }
      const tour = await Tour.find({ _id: { $in: tourId } })  // vì một tourId có thể có nhiều id nên phải dùng { _id: { $in: tourId } } object 
        .populate({
          path: "guideId",
          select:
            "profileInfo.firstName profileInfo.lastName profileInfo.profilePhoto profileInfo.city guideInfo.professionalTitle guideInfo.languages",
        })

        .populate({
          path: "rating",
          populate: {
            path: "userId",
            select: "profileInfo.firstName profileInfo.lastName",
          },
        });
      if (tour && tour.availability) {
        tour.availability = TourService.filterFutureAvailability(
          tour.availability
        );
      }
    
      return tour;
    } catch (error) {
      throw new Error(`Failed to fetch tour by ID: ${error.message}`);
    }
  }
}
module.exports = TourService;
