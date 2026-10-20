
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import PhoneInput, {
  isValidPhoneNumber,
  parsePhoneNumber
} from 'react-phone-number-input'

import type {
  Country,
  Value
} from 'react-phone-number-input'

import 'react-phone-number-input/style.css'

interface Customer {
  id: number
  name: string
  email: string
  company: string
  phone: string
}

type CustomerForm = Omit<Customer, 'id'>

const API_URL = 'http://localhost:5000/api/customers'

const emptyForm: CustomerForm = {
  name: '',
  email: '',
  company: '',
  phone: ''
}

const gmailTypos = [
  'gmil.com',
  'gail.com',
  'gmial.com',
  'gmai.com',
  'gmail.con',
  'gmail.co',
  'gmal.com',
  'gnail.com'
]

function validateCustomer(
  form: CustomerForm,
  selectedCountry: Country | undefined
): string {
  const name = form.name.trim()
  const email = form.email.trim().toLowerCase()
  const company = form.company.trim()
  const phone = form.phone.trim()

  // Customer name: letters only, with normal separators
  if (name.length < 2 || name.length > 100) {
    return 'Customer name must contain 2 to 100 characters.'
  }

  if (!/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(name)) {
    return 'Customer name must contain letters only. Numbers are not allowed.'
  }

  // Email validation
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return 'Please enter a valid email address.'
  }

  const domain = email.split('@')[1]

  if (gmailTypos.includes(domain)) {
    return 'Did you mean gmail.com? Please check your email address.'
  }

  // Company validation
  if (company.length < 2 || company.length > 150) {
    return 'Company name must contain 2 to 150 characters.'
  }

  // WhatsApp number validation
  if (!selectedCountry) {
    return 'Please select a country for your WhatsApp number.'
  }

  if (!phone || !isValidPhoneNumber(phone)) {
    return 'Enter a valid WhatsApp number for the selected country.'
  }

  const parsedPhone = parsePhoneNumber(phone)

  if (!parsedPhone) {
    return 'Invalid international WhatsApp number.'
  }

  // Check that the phone number belongs to the selected country.
  // Countries sharing a calling code may need special handling.
  if (
    parsedPhone.country &&
    parsedPhone.country !== selectedCountry
  ) {
    return 'The WhatsApp number does not match the selected country.'
  }

  // Specific India mobile validation
  if (selectedCountry === 'IN') {
    if (!/^[6-9]\d{9}$/.test(parsedPhone.nationalNumber)) {
      return 'Indian WhatsApp mobile numbers must contain exactly 10 digits and start with 6, 7, 8 or 9.'
    }
  }

  return ''
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedCountry, setSelectedCountry] =
    useState<Country | undefined>('AE')

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch(API_URL)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load customers.')
        }

        if (!Array.isArray(result.data)) {
          throw new Error('Invalid customer data.')
        }

        setCustomers(result.data)
      } catch {
        setError('Could not connect to the backend API.')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  function updateField(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }))

    setFormError('')
    setSuccess('')
  }

  function closeForm() {
    setShowForm(false)
    setForm(emptyForm)
    setSelectedCountry('AE')
    setFormError('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setFormError('')
    setSuccess('')

    const validationError = validateCustomer(
      form,
      selectedCountry
    )

    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          company: form.company.trim(),
          phone: form.phone.trim()
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to add customer.'
        )
      }

      setCustomers(previous => [
        ...previous,
        result.data
      ])

      setForm(emptyForm)
      setSelectedCountry('AE')
      setShowForm(false)
      setSuccess('Customer added successfully!')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to add customer. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Customer Directory
          </h2>

          <p className="mt-1 text-slate-500">
            Manage your business customers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              closeForm()
            } else {
              setShowForm(true)
              setSuccess('')
            }
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
        >
          {success}
        </div>
      )}

      {/* Add Customer Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
        >
          <h3 className="text-xl font-semibold text-slate-900">
            Add New Customer
          </h3>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600"
            >
              {formError}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* Customer Name */}
            <div>
              <label
                htmlFor="customer-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Customer Name *
              </label>

              <input
                id="customer-name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={event =>
                  updateField('name', event.target.value)
                }
                placeholder="Enter customer name"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Letters only. Numbers are not allowed.
              </p>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="customer-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address *
              </label>

              <input
                id="customer-email"
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={event =>
                  updateField('email', event.target.value)
                }
                placeholder="example@gmail.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Company */}
            <div>
              <label
                htmlFor="customer-company"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Company *
              </label>

              <input
                id="customer-company"
                type="text"
                required
                minLength={2}
                maxLength={150}
                value={form.company}
                onChange={event =>
                  updateField('company', event.target.value)
                }
                placeholder="Enter company name"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label
                htmlFor="customer-phone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                WhatsApp Number *
              </label>

              <div className="rounded-lg border border-slate-300 px-4 py-3 focus-within:border-blue-500">
                <PhoneInput
                  id="customer-phone"
                  international
                  countryCallingCodeEditable={false}
                  country={selectedCountry}
                  onCountryChange={country => {
                    setSelectedCountry(country)
                    updateField('phone', '')
                  }}
                  placeholder="Enter WhatsApp number"
                  value={
                    (form.phone || undefined) as Value | undefined
                  }
                  onChange={value =>
                    updateField('phone', value || '')
                  }
                  numberInputProps={{
                    className:
                      'w-full border-0 bg-transparent outline-none'
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Select your country flag and enter your
                WhatsApp number. The number must follow
                the selected country's numbering rules.
              </p>
            </div>
          </div>

          {/* Form buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loading and error */}
      {loading && (
        <p className="text-slate-500">
          Loading customers...
        </p>
      )}

      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {/* Customers Table */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Company</th>
                <th className="p-4">WhatsApp Number</th>
              </tr>
            </thead>

            <tbody>
              {customers.map(customer => (
                <tr
                  key={customer.id}
                  className="border-t border-slate-100"
                >
                  <td className="p-4 font-medium text-slate-900">
                    {customer.name}
                  </td>

                  <td className="p-4">
                    {customer.email}
                  </td>

                  <td className="p-4">
                    {customer.company}
                  </td>

                  <td className="p-4">
                    {customer.phone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <p className="p-4 text-slate-500">
              No customers found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
