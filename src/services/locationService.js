const axios = require("axios");

class LocationService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = "https://places.googleapis.com/v1/places";
  }

  async searchPlaces(input) {
    try {
      const response = await axios.post(
        `${this.baseUrl}:autocomplete`,
        {
          input: input.trim(),
          regionCode: "VN",
          languageCode: "en",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask": [
              "suggestions.placePrediction.placeId",
              "suggestions.placePrediction.text.text",
              "suggestions.placePrediction.structuredFormat.mainText.text",
              "suggestions.placePrediction.structuredFormat.secondaryText.text",
            ].join(","),
          },
        }
      );

      const suggestions = response.data?.suggestions || [];

      const predictions = suggestions
        .filter((s) => s.placePrediction)
        .map((s) => {
          const p = s.placePrediction;
          return {
            placeId: p.placeId,
            text: p.text?.text || "",
            mainText: p.structuredFormat?.mainText?.text || "",
            secondaryText: p.structuredFormat?.secondaryText?.text || "",
          };
        });
      return { predictions };
    } catch (err) {
      const detail = err.response?.data || err.message;
      throw new Error(`Autocomplete failed: ${JSON.stringify(detail)}`);
    }
  }

  async getPlaceDetails(placeId) {
    if (!placeId) {
      throw new Error("Place ID is required");
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,addressComponents",
        },
        params: {
          languageCode: "en",
          regionCode: "vn",
        },
      });

      const place = response.data;

      // Extract city from address components
      const addressComponents = place.addressComponents || [];
      let city = "";

      for (const component of addressComponents) {
        if (
          component.types.includes("locality") ||
          component.types.includes("administrative_area_level_2")
        ) {
          city = component.longText;
          break;
        }
      }

      return {
        placeId: place.id,
        address: place.formattedAddress,
        city: city || "Unknown",
        coordinates: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
      };
    } catch (err) {
      const detail = err.response?.data || err.message;
      throw new Error(`Place details failed: ${JSON.stringify(detail)}`);
    }
  }
}

module.exports = new LocationService();
