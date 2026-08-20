import { Navbar } from '@/components/navbar'

const OrganizationsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  )
}

export default OrganizationsLayout