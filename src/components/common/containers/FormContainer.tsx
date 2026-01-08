import React from 'react'

interface FormContainerProps {
  title?: string
  children: React.ReactNode
}

const FormContainer: React.FC<FormContainerProps> = ({ title, children }) => {
  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
        {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export default FormContainer
