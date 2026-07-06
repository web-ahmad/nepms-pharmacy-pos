'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, MapPin } from 'lucide-react';

// Dynamically import GeoMap to disable SSR for leaflet
const GeoMap = dynamic(() => import('./components/GeoMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

interface ExpiryItem {
  id: string;
  name: string;
  batch: string;
  current_stock: number;
  expiry_date: string;
  days_left: number;
}

interface SeasonalTrend {
  season_type: string;
  total_sales: number;
}

interface FraudAlert {
  cashier_id: string;
  name: string;
  void_count: number;
  total_transactions: number;
  void_rate: string;
  is_suspicious: boolean;
}

interface GeoData {
  area_zone: string;
  total_customers: number;
  total_sales: number;
}

export default function AnalyticsHub() {
  const [expiryData, setExpiryData] = useState<ExpiryItem[]>([]);
  const [seasonData, setSeasonData] = useState<SeasonalTrend[]>([]);
  const [fraudData, setFraudData] = useState<FraudAlert[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expiryRes, seasonRes, fraudRes, geoRes] = await Promise.all([
          fetch('/api/analytics/expiry-radar'),
          fetch('/api/analytics/seasonal-trends'),
          fetch('/api/analytics/fraud-detection'),
          fetch('/api/analytics/geospatial')
        ]);

        const [expiry, season, fraud, geo] = await Promise.all([
          expiryRes.json(),
          seasonRes.json(),
          fraudRes.json(),
          geoRes.json()
        ]);

        setExpiryData(expiry.data || []);
        setSeasonData(season.data || []);
        setFraudData(fraud.data || []);
        setGeoData(geo.data || []);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const suspiciousCashiers = fraudData.filter(c => c.is_suspicious);
  const highestSeason = seasonData.length > 0 
    ? [...seasonData].sort((a, b) => b.total_sales - a.total_sales)[0] 
    : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI & Analytics Hub</h1>
        <p className="text-slate-500">Live predictive insights and operational metrics.</p>
      </div>

      {/* TOP ROW: Urgent Alert Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Fraud / Anomaly Card */}
        <Card className={suspiciousCashiers.length > 0 ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              {suspiciousCashiers.length > 0 ? (
                <><AlertTriangle className="h-5 w-5 text-red-600" /> Fraud Alerts</>
              ) : (
                <><CheckCircle className="h-5 w-5 text-green-600" /> Fraud Alerts</>
              )}
            </CardTitle>
            <CardDescription>Suspicious VOID activities today</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              suspiciousCashiers.length > 0 ? (
                <div className="space-y-2">
                  {suspiciousCashiers.map(c => (
                    <div key={c.cashier_id} className="text-red-700 font-medium">
                      {c.name}: {c.void_count} voids ({c.void_rate})
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-green-700 font-medium">All Clear</div>
              )
            )}
          </CardContent>
        </Card>

        {/* Expiry Radar Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" /> Expiry Radar
            </CardTitle>
            <CardDescription>Items expiring in next 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-full" /> : (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-slate-900">{expiryData.length} Items</div>
                {expiryData.length > 0 ? (
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-red-500">{expiryData[0].name}</span> expires in {expiryData[0].days_left} days
                    {expiryData.length > 1 && `, ${expiryData[1].name} in ${expiryData[1].days_left} days`}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No upcoming expirations.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seasonal Alert Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" /> Top Season
            </CardTitle>
            <CardDescription>Highest selling season (30 Days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              highestSeason ? (
                <div>
                  <div className="text-2xl font-bold text-slate-900">{highestSeason.season_type}</div>
                  <div className="text-sm text-slate-600">
                    Volume: <span className="font-semibold text-blue-600">{highestSeason.total_sales.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No seasonal data available.</div>
              )
            )}
          </CardContent>
        </Card>

      </div>

      {/* MIDDLE ROW: Seasonal Trends Chart */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Sales Volume</CardTitle>
            <CardDescription>Aggregated sales categorized by item season type over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px] w-full" /> : (
              seasonData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="season_type" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${value}`, 'Sales Volume']} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="total_sales" fill="url(#colorSales)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">No Data Available</div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW: Geospatial Hotspots */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" /> Geospatial Sales Hotspots
            </CardTitle>
            <CardDescription>Sales distribution across mapped customer area zones.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? <Skeleton className="h-[400px] w-full" /> : (
              geoData.length > 0 ? (
                <GeoMap data={geoData} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-slate-500 border rounded-md">No Geospatial Data Available</div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
