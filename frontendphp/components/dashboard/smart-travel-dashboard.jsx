'use client'

import { useEffect, useState, memo, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import dynamic from 'next/dynamic'
import { AlertCircle, TrendingUp, Users, MapPin, Star } from 'lucide-react'
import apiClient from '@/services/apiClient'

// Dynamic import Plotly để tránh SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// Timeout utility
const fetchWithTimeout = async (endpoint, timeoutMs = 15000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await apiClient.get(endpoint)
    return response.data
  } finally {
    clearTimeout(timeoutId)
  }
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// Chart Components with memo to prevent re-renders
const ChartCard = memo(({ title, description, children, loading }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </CardContent>
  </Card>
))
ChartCard.displayName = 'ChartCard'

export default function SmartTravelDashboard() {
  const [overview, setOverview] = useState(null)
  const [placesByCategory, setPlacesByCategory] = useState(null)
  const [placesByRating, setPlacesByRating] = useState(null)
  const [topPlaces, setTopPlaces] = useState(null)
  const [placesByProvince, setPlacesByProvince] = useState(null)
  const [averageRating, setAverageRating] = useState(null)
  const [mapData, setMapData] = useState(null)
  const [cityRanking, setCityRanking] = useState(null)
  const [heatmapData, setHeatmapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Parallel fetch with timeout - chia ra 3 groups để tối ưu
        // Group 1: Critical data (Overview, Categories, Rating)
        const group1 = Promise.all([
          fetchWithTimeout('/api/smart-travel/dashboard/overview').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/places-by-category').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/places-by-rating').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/city-ranking').catch(() => null),
        ])

        // Group 2: Secondary data (Top places, Province, Average rating)
        const group2 = Promise.all([
          fetchWithTimeout('/api/smart-travel/dashboard/top-places').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/places-by-province').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/average-rating-by-category').catch(() => null),
          fetchWithTimeout('/api/smart-travel/dashboard/city-category-matrix').catch(() => null),
        ])

        // Group 3: Map data (Heavy, load last)
        const group3 = fetchWithTimeout('/api/smart-travel/dashboard/map-data', 20000).catch(() => null)

        // Wait for critical data first
        const [overviewRes, categoryRes, ratingRes, cityRes] = await group1
        setOverview(overviewRes)
        setPlacesByCategory(categoryRes)
        setPlacesByRating(ratingRes)
        setCityRanking(cityRes)

        // Then load secondary data
        const [topRes, provinceRes, ratingCategoryRes, heatmapRes] = await group2
        setTopPlaces(topRes)
        setPlacesByProvince(provinceRes)
        setAverageRating(ratingCategoryRes)
        setHeatmapData(heatmapRes)

        // Finally load map data
        const mapRes = await group3
        setMapData(mapRes)

        setLoading(false)
      } catch (err) {
        console.error('[Smart Travel Dashboard Error]', err)
        setError('Failed to load dashboard data: ' + (err.message || 'Unknown error'))
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={`metric-${i}`} className="h-32" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={`chart1-${i}`} className="h-96" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={`chart2-${i}`} className="h-96" />
          ))}
        </div>

        {/* Table Skeleton */}
        <Skeleton className="h-80" />

        {/* Map Skeleton */}
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Smart Travel Dashboard</h1>
        <p className="text-muted-foreground">Phân tích dữ liệu từ collection Places - MongoDB Atlas</p>
      </div>

      {/* Key Metrics */}
      {overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số Places</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalPlaces?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">từ MongoDB Atlas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating Trung Bình</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.averageRating}</div>
              <p className="text-xs text-muted-foreground">Min: {overview.minRating} | Max: {overview.maxRating}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        )
      )}

      {/* PRIORITY 1: City Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Bảng Xếp Hạng Thành Phố (PRIORITY 1)</CardTitle>
          <CardDescription>Top 20 cities by average rating - Click to sort</CardDescription>
        </CardHeader>
        <CardContent>
          {cityRanking ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Thành Phố</th>
                    <th className="text-center py-3 px-4">Số Places</th>
                    <th className="text-center py-3 px-4">Rating ⭐</th>
                    <th className="text-left py-3 px-4">Danh Mục Hàng Đầu</th>
                  </tr>
                </thead>
                <tbody>
                  {cityRanking.map?.((city, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-bold">
                        {city.rank === 1 ? '🥇' : city.rank === 2 ? '🥈' : city.rank === 3 ? '🥉' : `#${city.rank}`}
                      </td>
                      <td className="py-3 px-4 font-medium">{city.city}</td>
                      <td className="py-3 px-4 text-center">{city.count}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={city.avgRating >= 4.5 ? 'bg-green-100 text-green-800' : city.avgRating >= 4.3 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                          {city.avgRating} ⭐
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs">{city.topCategory?.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Places by Category - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Số lượng Places theo Category</CardTitle>
            <CardDescription>Top 20 categories</CardDescription>
          </CardHeader>
          <CardContent>
            {placesByCategory ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={placesByCategory.categories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Đang tải dữ liệu...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Places by Rating - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố Places theo Rating</CardTitle>
            <CardDescription>Distribution by rating ranges</CardDescription>
          </CardHeader>
          <CardContent>
            {placesByRating ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={placesByRating.ratingDistribution}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    label
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Đang tải dữ liệu...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Rating by Category - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Trung Bình theo Category</CardTitle>
            <CardDescription>Top 20 categories by average rating</CardDescription>
          </CardHeader>
          <CardContent>
            {averageRating ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={averageRating.categoryRatings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgRating" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Đang tải dữ liệu...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Places by Province - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Số lượng Places theo Tỉnh Thành</CardTitle>
            <CardDescription>Top 20 provinces</CardDescription>
          </CardHeader>
          <CardContent>
            {placesByProvince ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={placesByProvince.provinces} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="province" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Đang tải dữ liệu...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 
        PRIORITY 2: Heatmap - Cities vs Categories (MOST VALUABLE!)
        This heatmap shows the relationship between cities and place categories.
        "Where to find what?" - Helps users understand which types of places are most common in each city.
        For example: Which city has the most restaurants? Which city has the best shopping?
        Data source: MongoDB aggregation counting places by city and category combinations.
      */}
      {/* <Card>
        <CardHeader>
          <CardTitle>🔥 Bản Đồ Nhiệt - Thành Phố vs Danh Mục (PRIORITY 2 - CORE!)</CardTitle>
          <CardDescription>"Where to find what?" - Mối quan hệ giữa thành phố và danh mục địa điểm</CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapData ? (
            <div className="overflow-auto">
              <div className="text-xs text-gray-600 mb-4">
                🎯 Mỗi ô hiển thị số lượng địa điểm: Đỏ = nhiều, Xám = ít
              </div>
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border p-1 bg-gray-200 text-left min-w-24">Thành Phố</th>
                    {heatmapData.categories?.slice(0, 15).map((cat) => (
                      <th 
                        key={cat} 
                        className="border p-1 bg-gray-200 text-center min-w-16 transform -rotate-45 origin-center text-xs"
                      >
                        <div className="h-12">{cat?.slice(0, 8)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.cities?.map((city, cityIdx) => (
                    <tr key={city}>
                      <td className="border p-2 font-bold bg-gray-100 min-w-24">{city}</td>
                      {heatmapData.matrix?.[cityIdx]?.slice(0, 15).map((value, catIdx) => {
                        const percentage = (value / (heatmapData.maxValue || 1)) * 100
                        let bgColor = 'bg-gray-100'
                        if (percentage > 75) bgColor = 'bg-red-600'
                        else if (percentage > 50) bgColor = 'bg-red-400'
                        else if (percentage > 25) bgColor = 'bg-red-200'
                        else if (percentage > 10) bgColor = 'bg-orange-100'
                        
                        return (
                          <td 
                            key={`${city}-${catIdx}`}
                            className={`border p-2 text-center text-xs font-semibold ${bgColor} hover:opacity-80 cursor-pointer transition`}
                            title={`${city} + ${heatmapData.categories?.[catIdx]}: ${value} places (${percentage.toFixed(0)}%)`}
                          >
                            {value > 0 ? value : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-red-600" />
                  <span>75-100% (Nhiều)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-red-400" />
                  <span>50-75%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-red-200" />
                  <span>25-50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-orange-100" />
                  <span>&lt;25% (Ít)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Đang tải heatmap...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Places - Rating Cao Nhất</CardTitle>
          <CardDescription>Best rated places on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {topPlaces ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Tên Place</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-center py-3 px-4">Rating</th>
                    <th className="text-center py-3 px-4">Review Count</th>
                    <th className="text-left py-3 px-4">Địa chỉ</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlaces.topPlaces?.map((place, idx) => (
                    <tr key={place.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{idx + 1}. {place.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{place.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-yellow-100 text-yellow-800">{place.rating} ⭐</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">{place.reviewCount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground truncate">{place.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Đang tải dữ liệu...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 
        Map Scatter Chart - Geographic Distribution
        Shows the geographical distribution of travel places worldwide.
        Uses Plotly.js with Mapbox for interactive mapping.
        Each point represents a place with color coding based on rating.
        Data source: MongoDB places collection with latitude/longitude coordinates.
        Performance: Heavy data load (500+ points), loaded last in the sequence.
      */}
      {/* Map Scatter Chart - Lazy Load
      <Card>
        <CardHeader>
          <CardTitle>Bản đồ Phân bố Địa điểm Du lịch</CardTitle>
          <CardDescription>Vị trí địa lý của {mapData?.totalPoints || 0} địa điểm trên bản đồ thế giới</CardDescription>
        </CardHeader>
        <CardContent>
          {mapData ? (
            <div className="w-full h-[600px]">
              <Plot
                data={[{
                  type: 'scattermapbox',
                  lat: mapData.mapData?.map(point => point.lat) || [],
                  lon: mapData.mapData?.map(point => point.lon) || [],
                  mode: 'markers',
                  marker: {
                    size: 5,
                    color: mapData.mapData?.map(point => point.rating) || [],
                    colorscale: 'Viridis',
                    showscale: true,
                    colorbar: {
                      title: 'Rating',
                      titleside: 'right'
                    },
                    opacity: 0.7
                  },
                  text: mapData.mapData?.map(point => 
                    `<b>${point.name}</b><br>` +
                    `Category: ${point.category}<br>` +
                    `Rating: ${point.rating} ⭐<br>` +
                    `Reviews: ${point.reviewCount}`
                  ) || [],
                  hoverinfo: 'text'
                }]}
                layout={{
                  mapbox: {
                    style: 'open-street-map',
                    center: { lat: 20, lon: 0 },
                    zoom: 1
                  },
                  margin: { r: 0, t: 0, l: 0, b: 0 },
                  height: 600,
                  showlegend: false,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)'
                }}
                config={{
                  mapboxAccessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
                  responsive: true
                }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Đang tải dữ liệu bản đồ...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Data Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Thông tin Dữ liệu</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>✅ Dữ liệu được lấy từ: <code className="bg-black/10 px-2 py-1 rounded">smart_travel.places</code> (MongoDB Atlas)</p>
          <p>✅ Queries được viết trực tiếp bằng MongoDB Aggregation Pipeline</p>
          <p>✅ Biểu đồ được vẽ bằng Recharts library (không dùng công cụ bên ngoài)</p>
          <p>✅ Cập nhật lần cuối: {overview?.timestamp}</p>
        </CardContent>
      </Card>
    </div>
  )
}
