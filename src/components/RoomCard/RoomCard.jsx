import './RoomCard.css'

export default function RoomCard({ icon, title, description, onClick }) {
  return (
    <button className="room-card" onClick={onClick}>
      <div className="room-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </button>
  )
}
