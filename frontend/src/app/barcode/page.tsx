"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { post } from '@/api/client';

interface ScanResult {
  success: boolean;
  upc?: string;
  product?: {
    name: string;
    brand: string;
    source: string;
    nutrition: {
      calories: number;
      protein_g: number;
      fat_g: number;
      carbs_g: number;
      fiber_g?: number;
      sodium_mg?: number;
    };
    food_id?: number;
  };
  error?: string;
  suggestions?: string[];
  scan_method?: string;
}

interface ScanHistory {
  history: Array<{
    upc: string;
    product_name?: string;
    brand?: string;
    success: boolean;
    source?: string;
    scanned_at: string;
  }>;
  stats: {
    total_scans: number;
    successful_scans: number;
    success_rate: number;
  };
}

export default function BarcodePage() {
  const [upc, setUpc] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState<ScanHistory | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001'}/barcode/history/1`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      setScanning(true);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setResult({
        success: false,
        error: 'Camera access denied. Please enable camera permissions and try again.',
        suggestions: [
          'Check browser permissions for camera access',
          'Try refreshing the page',
          'Use manual UPC entry instead'
        ]
      });
      setScanning(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    // Send to backend for barcode detection
    try {
      setLoading(true);
      const scanResult = await post('/barcode/scan', {
        image_data: imageData,
        user_id: 1
      }) as ScanResult;
      
      setResult(scanResult);
      
      if (scanResult.success) {
        stopCamera();
        loadHistory(); // Refresh history
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error?.message || 'Scan failed',
        suggestions: ['Try again with better lighting', 'Ensure barcode is clearly visible']
      });
    } finally {
      setLoading(false);
    }
  }, [stopCamera]);

  const lookupManualUpc = async () => {
    if (!upc.trim()) return;
    
    setLoading(true);
    try {
      const scanResult = await post('/barcode/scan', {
        upc: upc.trim(),
        user_id: 1
      }) as ScanResult;
      
      setResult(scanResult);
      loadHistory(); // Refresh history
    } catch (error: any) {
      setResult({
        success: false,
        error: error?.message || 'Lookup failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const logFood = async (foodData: any) => {
    try {
      // Use the existing agent endpoint to log the food
      const logMessage = `log meal: ${foodData.name} 100g for breakfast`;
      await post('/agent/1', { message: logMessage });
      
      setResult({
        ...result!,
        success: true,
        // Add a logged flag or message
      });
      
      alert(`✅ Logged ${foodData.name} successfully!`);
    } catch (error) {
      alert('❌ Failed to log food. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📱 Barcode Scanner
        </h1>
        <p className="text-gray-600">
          Scan product barcodes with your camera or enter UPC manually
        </p>
      </div>

      {/* Camera Scanner */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">📷 Camera Scanner</h2>
        
        {!scanning ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-4xl">📷</span>
              </div>
              <p className="text-gray-600 mb-4">
                Use your camera to scan product barcodes automatically
              </p>
            </div>
            <button
              onClick={startCamera}
              className="btn btn-primary btn-lg"
            >
              📷 Start Camera Scan
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 md:h-80 object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white border-dashed w-64 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Position barcode here
                  </span>
                </div>
              </div>
              
              {/* Capture button */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={captureFrame}
                  disabled={loading}
                  className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="spinner inline-block mr-2"></div>
                      Scanning...
                    </>
                  ) : (
                    '📸 Scan Barcode'
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={stopCamera}
                className="btn text-gray-600"
              >
                ❌ Stop Camera
              </button>
            </div>
          </div>
        )}
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Manual UPC Entry */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">⌨️ Manual Entry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UPC/Barcode Number
            </label>
            <input
              type="text"
              value={upc}
              onChange={(e) => setUpc(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="Enter 12 or 13 digit barcode (e.g., 012345678901)"
              className="w-full"
              onKeyPress={(e) => e.key === 'Enter' && lookupManualUpc()}
            />
          </div>
          <button
            onClick={lookupManualUpc}
            disabled={loading || !upc.trim()}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <>
                <div className="spinner inline-block mr-2"></div>
                Looking up...
              </>
            ) : (
              '🔍 Lookup Barcode'
            )}
          </button>
        </div>
      </div>

      {/* Scan Result */}
      {result && (
        <div className={`card ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">
              {result.success ? '✅ Product Found!' : '❌ Scan Failed'}
            </h2>
            <button
              onClick={() => setResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {result.success && result.product ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{result.product.name}</h3>
                <p className="text-gray-600">{result.product.brand}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {result.product.source}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    UPC: {result.upc}
                  </span>
                </div>
              </div>

              {/* Nutrition Info */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold mb-3">Nutrition (per 100g)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.product.nutrition.calories || 0}
                    </div>
                    <div className="text-sm text-gray-600">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {(result.product.nutrition.protein_g || 0).toFixed(1)}g
                    </div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {(result.product.nutrition.fat_g || 0).toFixed(1)}g
                    </div>
                    <div className="text-sm text-gray-600">Fat</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(result.product.nutrition.carbs_g || 0).toFixed(1)}g
                    </div>
                    <div className="text-sm text-gray-600">Carbs</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => logFood(result.product)}
                className="btn btn-success w-full"
              >
                📝 Log This Food
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-red-700">{result.error}</p>
              {result.suggestions && (
                <div>
                  <p className="font-medium text-red-800 mb-2">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scan History */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">📊 Scan History</h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-sm"
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>

        {history && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-900">
                {history.stats.total_scans}
              </div>
              <div className="text-sm text-gray-600">Total Scans</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {history.stats.successful_scans}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {history.stats.success_rate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        )}

        {showHistory && history && (
          <div className="space-y-2">
            <h3 className="font-semibold">Recent Scans</h3>
            {history.history.length > 0 ? (
              <div className="space-y-2">
                {history.history.slice(0, 10).map((scan, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      scan.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          {scan.success ? (
                            <>
                              {scan.product_name || 'Unknown Product'}
                              {scan.brand && (
                                <span className="text-gray-600"> - {scan.brand}</span>
                              )}
                            </>
                          ) : (
                            `UPC: ${scan.upc}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        scan.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {scan.success ? '✅ Found' : '❌ Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No scan history yet. Try scanning your first barcode!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-semibold mb-3 text-blue-900">💡 Scanning Tips</h2>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• Ensure good lighting when scanning</li>
          <li>• Hold the camera steady and close to the barcode</li>
          <li>• Try different angles if the first scan doesn't work</li>
          <li>• Clean your camera lens for better results</li>
          <li>• Use manual entry if camera scanning fails</li>
        </ul>
      </div>
    </div>
  );
}