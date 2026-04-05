import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Upload, Cpu, Zap, HardDrive, X, Copy, CheckCircle } from "lucide-react";

export default function SubmitJob() {
  const [jobName, setJobName] = useState("");
  const [jobType, setJobType] = useState("render");
  const [gpuType, setGpuType] = useState("RTX 3090");
  const [duration, setDuration] = useState("1");
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-28 right-24 w-44 h-44 border-2 border-cyan-500/40 rounded-full shadow-lg shadow-cyan-500/25"
          animate={{
            rotateX: [0, 180, 360],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-28 right-56 w-38 h-38 border-2 border-blue-500/30 rounded-lg"
          animate={{
            rotateZ: [0, 360],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Submit New Job</h1>
        <p className="text-slate-400">Configure and submit your compute job to the network.</p>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* Job Configuration */}
          <motion.div
            className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Job Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Job Name</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Enter job name"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="render">Render</option>
                  <option value="training">Training</option>
                  <option value="inference">Inference</option>
                  <option value="simulation">Simulation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">GPU Type</label>
                <select
                  value={gpuType}
                  onChange={(e) => setGpuType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="RTX 3090">RTX 3090</option>
                  <option value="RTX 4090">RTX 4090</option>
                  <option value="A100">A100</option>
                  <option value="H100">H100</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Duration (hours)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="24"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </motion.div>

          {/* File Upload */}
          <motion.div
            className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Upload Files</h2>

            <div className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center hover:border-cyan-500 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-white mb-2">Drop files here or click to browse</p>
              <p className="text-slate-500 text-sm">Supports: .py, .ipynb, .zip, .tar.gz</p>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            className="w-full px-6 py-4 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Submit Job to Network
          </motion.button>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <motion.div
            className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-bold text-white mb-4">Estimated Cost</h3>
            <div className="text-4xl font-bold text-cyan-400 mb-2">₹250</div>
            <p className="text-slate-400 text-sm">per hour</p>
          </motion.div>

          <motion.div
            className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-lg font-bold text-white mb-4">Network Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-400">Available GPUs</span>
                </div>
                <span className="text-white font-semibold">247</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-slate-400">Active Jobs</span>
                </div>
                <span className="text-white font-semibold">89</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <span className="text-slate-400">Queue Size</span>
                </div>
                <span className="text-white font-semibold">12</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Your Balance</h3>
            <div className="text-3xl font-bold text-white mb-1">₹50.00</div>
            <button
              onClick={() => setShowBankModal(true)}
              className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
            >
              Add funds →
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bank Details Modal */}
      <AnimatePresence>
        {showBankModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBankModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Bank Transfer Details</h2>
                  <button
                    onClick={() => setShowBankModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <p className="text-slate-400 mb-6">
                  Transfer funds to the bank account below. Your balance will be updated within 24 hours.
                </p>

                {/* Bank Details */}
                <div className="space-y-4">
                  {/* Bank Name */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">Bank Name</div>
                        <div className="text-white font-semibold">HDFC Bank</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard("HDFC Bank", "bank")}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedField === "bank" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Number */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">Account Number</div>
                        <div className="text-white font-mono font-semibold">50200012345678</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard("50200012345678", "account")}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedField === "account" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* IFSC Code */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">IFSC Code</div>
                        <div className="text-white font-mono font-semibold">HDFC0001234</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard("HDFC0001234", "ifsc")}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedField === "ifsc" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Holder Name */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">Account Holder Name</div>
                        <div className="text-white font-semibold">CampusGrid Technologies Pvt Ltd</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard("CampusGrid Technologies Pvt Ltd", "name")}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedField === "name" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">UPI ID</div>
                        <div className="text-white font-mono font-semibold">campusgrid@hdfcbank</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard("campusgrid@hdfcbank", "upi")}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedField === "upi" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-400 text-sm">
                    <strong>Note:</strong> Please include your user ID in the transfer remarks for faster processing.
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowBankModal(false)}
                  className="w-full mt-6 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
