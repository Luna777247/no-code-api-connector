// Places Data Normalizer - Chuẩn hóa API responses về cấu trúc Places chung
export interface StandardPlace {
  name: string
  address: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  category: 'destination' | 'hotel' | 'restaurant' | 'attraction'
  rating?: number
  price_range?: string
  source_api: string
  source_id: string
  raw_data: any
}

export class PlacesNormalizer {
  
  /**
   * Chuẩn hóa dữ liệu từ các API khác nhau về cấu trúc Places chung
   */
  normalizeToPlaces(apiResponse: any, sourceApi: string): StandardPlace[] {
    console.log(`[v0] Normalizing ${sourceApi} response to Places format`)
    
    switch (sourceApi.toLowerCase()) {
      case 'rapidapi_places':
        return this.normalizeRapidApiPlaces(apiResponse)
      case 'google_places':
        return this.normalizeGooglePlaces(apiResponse)
      case 'tripadvisor':
        return this.normalizeTripAdvisor(apiResponse)
      default:
        return this.normalizeGenericApi(apiResponse, sourceApi)
    }
  }

  private normalizeRapidApiPlaces(data: any): StandardPlace[] {
    if (!data.results) return []
    
    return data.results.map((item: any) => ({
      name: item.name || item.display_name || 'Unknown',
      address: item.address || item.formatted_address || '',
      latitude: item.latitude || item.lat || null,
      longitude: item.longitude || item.lng || item.lon || null,
      phone: item.phone || item.phone_number || null,
      website: item.website || item.url || null,
      category: this.detectCategory(item),
      rating: item.rating || item.review_score || null,
      price_range: item.price_level || item.price_range || null,
      source_api: 'rapidapi_places',
      source_id: String(item.id || item.place_id || item.fsq_id),
      raw_data: item
    }))
  }

  private normalizeGooglePlaces(data: any): StandardPlace[] {
    if (!data.results) return []
    
    return data.results.map((item: any) => ({
      name: item.name || 'Unknown',
      address: item.formatted_address || item.vicinity || '',
      latitude: item.geometry?.location?.lat || null,
      longitude: item.geometry?.location?.lng || null,
      phone: item.formatted_phone_number || null,
      website: item.website || null,
      category: this.detectCategoryFromTypes(item.types),
      rating: item.rating || null,
      price_range: item.price_level ? `${'$'.repeat(item.price_level)}` : null,
      source_api: 'google_places',
      source_id: item.place_id,
      raw_data: item
    }))
  }

  private normalizeTripAdvisor(data: any): StandardPlace[] {
    const items = data.data || [data]
    
    return items.map((item: any) => ({
      name: item.name || 'Unknown',
      address: item.address_obj?.address_string || item.address || '',
      latitude: parseFloat(item.latitude) || null,
      longitude: parseFloat(item.longitude) || null,
      phone: item.phone || null,
      website: item.website || null,
      category: this.detectCategory(item),
      rating: parseFloat(item.rating) || null,
      price_range: item.price_level || null,
      source_api: 'tripadvisor',
      source_id: String(item.location_id),
      raw_data: item
    }))
  }

  private normalizeGenericApi(data: any, sourceApi: string): StandardPlace[] {
    // Fallback cho các API không được định nghĩa sẵn
    const items = Array.isArray(data) ? data : data.results || data.data || [data]
    
    return items.map((item: any, index: number) => ({
      name: this.extractName(item),
      address: this.extractAddress(item),
      latitude: this.extractLatitude(item),
      longitude: this.extractLongitude(item),
      phone: this.extractPhone(item),
      website: this.extractWebsite(item),
      category: this.detectCategory(item),
      rating: this.extractRating(item),
      price_range: this.extractPriceRange(item),
      source_api: sourceApi,
      source_id: String(item.id || item.place_id || index),
      raw_data: item
    }))
  }

  private detectCategory(item: any): 'destination' | 'hotel' | 'restaurant' | 'attraction' {
    const text = JSON.stringify(item).toLowerCase()
    
    if (text.includes('hotel') || text.includes('accommodation') || text.includes('lodging')) {
      return 'hotel'
    }
    if (text.includes('restaurant') || text.includes('food') || text.includes('dining')) {
      return 'restaurant'
    }
    if (text.includes('attraction') || text.includes('museum') || text.includes('park')) {
      return 'attraction'
    }
    return 'destination'
  }

  private detectCategoryFromTypes(types: string[]): 'destination' | 'hotel' | 'restaurant' | 'attraction' {
    if (!types) return 'destination'
    
    const typeStr = types.join(' ').toLowerCase()
    if (typeStr.includes('lodging')) return 'hotel'
    if (typeStr.includes('restaurant') || typeStr.includes('food')) return 'restaurant'
    if (typeStr.includes('tourist_attraction') || typeStr.includes('museum')) return 'attraction'
    return 'destination'
  }

  // Helper methods để extract data từ các field phổ biến
  private extractName(item: any): string {
    return item.name || item.title || item.display_name || item.business_name || 'Unknown'
  }

  private extractAddress(item: any): string {
    return item.address || item.formatted_address || item.location?.address || 
           item.address_obj?.address_string || item.street_address || ''
  }

  private extractLatitude(item: any): number | null {
    return parseFloat(item.latitude || item.lat || item.location?.lat || 
                     item.coordinates?.latitude || item.geo?.lat) || null
  }

  private extractLongitude(item: any): number | null {
    return parseFloat(item.longitude || item.lng || item.lon || item.location?.lng || 
                     item.coordinates?.longitude || item.geo?.lng) || null
  }

  private extractPhone(item: any): string | null {
    return item.phone || item.phone_number || item.contact?.phone || 
           item.formatted_phone_number || null
  }

  private extractWebsite(item: any): string | null {
    return item.website || item.url || item.web_url || item.homepage || null
  }

  private extractRating(item: any): number | null {
    return parseFloat(item.rating || item.review_score || item.stars || 
                     item.user_rating) || null
  }

  private extractPriceRange(item: any): string | null {
    return item.price_range || item.price_level || item.price_category || 
           item.budget_level || null
  }
}