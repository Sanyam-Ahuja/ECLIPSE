import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Download, Plus, TrendingDown, TrendingUp, Wallet, X, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function Billing() {
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  const transactions = [
    {
      id: "TXN-001234",
      description: "GPU Usage - RTX 3090",
      amount: -245.50,
      date: "2 hours ago",
      status: "completed",
    },
    {
      id: "TXN-001233",
      description: "Account Top-up",
      amount: 500.00,
      date: "1 day ago",
      status: "completed",
    },
    {
      id: "TXN-001232",
      description: "Training Job - A100",
      amount: -180.25,
      date: "2 days ago",
      status: "completed",
    },
    {
      id: "TXN-001231",
      description: "Rendering Task",
      amount: -75.00,
      date: "3 days ago",
      status: "completed",
    },
    {
      id: "TXN-001230",
      description: "Account Top-up",
      amount: 1000.00,
      date: "5 days ago",
      status: "completed",
    },
  ];

  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-36 right-28 w-50 h-50 border-2 border-cyan-500/35 rounded-full shadow-lg shadow-cyan-500/20"
          animate={{
            rotateY: [0, 360],
            scale: [1, 1.14, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-36 right-64 w-42 h-42 border-2 border-blue-500/28"
          style={{
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
          animate={{
            rotateY: [0, 360],
            y: [-12, 12, -12],
          }}
          transition={{
            rotateY: {
              duration: 19,
              repeat: Infinity,
              ease: "linear",
            },
            y: {
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Billing</h1>
          <p className="text-slate-400">Manage your balance, payments, and transaction history.</p>
        </div>
        <button
          onClick={() => setShowBankModal(true)}
          className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Funds
        </button>
      </div>

      {/* Balance Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-6 mb-8">
        <motion.div
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Current Balance</span>
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">₹254.50</div>
          <p className="text-cyan-400 text-sm">Available to use</p>
        </motion.div>

        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">This Month</span>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingDown className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">₹500.75</div>
          <p className="text-slate-400 text-sm">Total spent</p>
        </motion.div>

        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Avg. Daily Cost</span>
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">₹16.69</div>
          <p className="text-slate-400 text-sm">Last 30 days</p>
        </motion.div>
      </div>

      {/* Payment Method */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Payment Method</h2>
          <button className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm">
            Add New
          </button>
        </div>

        <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-8">
            <CreditCard className="w-10 h-10" />
            <span className="text-sm font-medium">VISA</span>
          </div>
          <div className="font-mono text-xl mb-6 tracking-wider">
            •••• •••• •••• 4532
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-100 mb-1">Card Holder</div>
              <div className="font-medium">Rahul Kumar</div>
            </div>
            <div>
              <div className="text-xs text-cyan-100 mb-1">Expires</div>
              <div className="font-medium">12/26</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 text-sm border-b border-slate-800">
                <th className="pb-4 font-medium">TRANSACTION ID</th>
                <th className="pb-4 font-medium">DESCRIPTION</th>
                <th className="pb-4 font-medium">AMOUNT</th>
                <th className="pb-4 font-medium">DATE</th>
                <th className="pb-4 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                >
                  <td className="py-4 text-white font-mono text-sm">{transaction.id}</td>
                  <td className="py-4 text-white">{transaction.description}</td>
                  <td className={`py-4 font-semibold ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="py-4 text-slate-400">{transaction.date}</td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {transaction.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

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
