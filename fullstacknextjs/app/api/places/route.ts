import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { PlacesNormalizer } from "@/lib/places-normalizer"
import { CollectionManager } from "@/lib/database-schema"

// GET /api/places - Lấy danh sách places đã chuẩn hóa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // destination, hotel, restaurant, attraction
    const sourceApi = searchParams.get('source_api')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search')

    console.log("[v0] Fetching places:", { category, sourceApi, page, limit, search })

    const db = await getDb()
    const collection = db.collection(CollectionManager.getCollectionName('DATA'))

    // Build filter - always include type filter for places_standardized
    const filters: any = { type: 'places_standardized' }
    if (category) filters['data.category'] = category
    if (sourceApi) filters['placesMetadata.sourceApi'] = sourceApi
    if (search) {
      filters.$or = [
        { 'data.name': { $regex: search, $options: 'i' } },
        { 'data.address': { $regex: search, $options: 'i' } }
      ]
    }

    // Get places with pagination
    const places = await collection
      .find(filters)
      .sort({ _insertedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(filters)

    // Transform places data to match expected format
    const transformedPlaces = places.map(place => ({
      _id: place._id,
      ...place.data,
      _insertedAt: place._insertedAt,
      source_api: place.placesMetadata?.sourceApi || 'unknown',
      normalized: place.placesMetadata?.normalized || false
    }))

    // If no data, return mock places data
    if (transformedPlaces.length === 0) {
      const mockPlaces = [
        {
          _id: "1",
          name: "Khách sạn Mường Thanh Luxury",
          address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
          latitude: 10.7769,
          longitude: 106.7009,
          phone: "+84-28-1234-5678",
          website: "https://muongthanh.com",
          category: "hotel",
          rating: 4.5,
          price_range: "$$$",
          source_api: "rapidapi_places",
          source_id: "hotel_123",
          _insertedAt: new Date().toISOString(),
          raw_data: {}
        },
        {
          _id: "2", 
          name: "Nhà hàng Ngon Villa",
          address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
          latitude: 10.7745,
          longitude: 106.7019,
          phone: "+84-28-8765-4321",
          website: null,
          category: "restaurant",
          rating: 4.2,
          price_range: "$$",
          source_api: "google_places",
          source_id: "restaurant_456",
          _insertedAt: new Date().toISOString(),
          raw_data: {}
        },
        {
          _id: "3",
          name: "Chợ Bến Thành",
          address: "Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
          latitude: 10.7725,
          longitude: 106.6980,
          phone: null,
          website: null,
          category: "attraction",
          rating: 4.0,
          price_range: null,
          source_api: "tripadvisor",
          source_id: "attraction_789",
          _insertedAt: new Date().toISOString(),
          raw_data: {}
        }
      ].filter(place => {
        if (category && place.category !== category) return false
        if (sourceApi && place.source_api !== sourceApi) return false
        if (search && !place.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })

      return NextResponse.json({
        places: mockPlaces.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: mockPlaces.length,
          pages: Math.ceil(mockPlaces.length / limit)
        },
        filters: { category, sourceApi, search },
        stats: {
          by_category: {
            hotel: 1,
            restaurant: 1,
            attraction: 1,
            destination: 0
          },
          by_source: {
            rapidapi_places: 1,
            google_places: 1,
            tripadvisor: 1
          }
        }
      })
    }

    return NextResponse.json({
      places: transformedPlaces,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: { category, sourceApi, search }
    })

  } catch (error) {
    console.error("[v0] Error fetching places:", error)
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    )
  }
}

// POST /api/places - Normalize và lưu places từ API response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiResponse, sourceApi, connectionId } = body

    console.log("[v0] Normalizing places from:", sourceApi)

    // Normalize data sử dụng PlacesNormalizer
    const normalizer = new PlacesNormalizer()
    const standardizedPlaces = normalizer.normalizeToPlaces(apiResponse, sourceApi)

    if (standardizedPlaces.length === 0) {
      return NextResponse.json(
        { error: "No places found in API response" },
        { status: 400 }
      )
    }

    // Save to MongoDB
    const db = await getDb()
    const collection = db.collection(CollectionManager.getCollectionName('DATA'))

    // Add metadata in new schema format
    const placesWithMetadata = standardizedPlaces.map(place => ({
      type: 'places_standardized' as const,
      connectionId,
      _insertedAt: new Date().toISOString(),
      data: place,
      placesMetadata: {
        sourceApi,
        normalized: true,
        standardizationVersion: '1.0'
      }
    }))

    const result = await collection.insertMany(placesWithMetadata)

    console.log(`[v0] Inserted ${result.insertedCount} standardized places to ${CollectionManager.getCollectionName('DATA')} (type: places_standardized)`)

    return NextResponse.json({
      message: `Successfully normalized and saved ${result.insertedCount} places`,
      insertedCount: result.insertedCount,
      places: standardizedPlaces.map(place => ({
        name: place.name,
        category: place.category,
        source_api: place.source_api
      }))
    })

  } catch (error) {
    console.error("[v0] Error normalizing places:", error)
    return NextResponse.json(
      { error: "Failed to normalize places data" },
      { status: 500 }
    )
  }
}
