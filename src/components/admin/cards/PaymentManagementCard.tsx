import React from 'react'
import { Link } from 'react-router-dom'

const PaymentManagementCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Payment Management</h2>
        <p>Track payments and generate payment links</p>
        <div className="card-actions justify-end">
          <Link to="/admin/payments" className="btn btn-primary">Manage Payments</Link>
        </div>
      </div>
    </div>
  )
}

export default PaymentManagementCard
