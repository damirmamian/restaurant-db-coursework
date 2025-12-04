document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reservation-form');
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.username) document.getElementById('res-name').value = user.username;
        if (user.email) document.getElementById('res-email').value = user.email;
    }
    const dateInput = document.getElementById('res-date');
    const timeSelect = document.getElementById('res-time');
    if (dateInput && timeSelect) {
        timeSelect.innerHTML = '<option value="" disabled selected>Спочатку оберіть дату</option>';
        timeSelect.disabled = true;
        dateInput.addEventListener('change', function () {
            const dateVal = this.value;
            if (!dateVal) {
                timeSelect.disabled = true;
                timeSelect.innerHTML = '<option value="" disabled selected>Спочатку оберіть дату</option>';
                return;
            }
            timeSelect.disabled = false;
            timeSelect.innerHTML = '<option value="" disabled selected>Оберіть час</option>';
            const dateObj = new Date(dateVal);
            const dayIndex = dateObj.getUTCDay();
            let startHour = 10;
            let endHour = 20;
            if (dayIndex === 0 || dayIndex === 6) {
                endHour = 18;
            }
            for (let hour = startHour; hour <= endHour; hour++) {
                const hourStr = hour.toString().padStart(2, '0');
                const optionFull = document.createElement('option');
                optionFull.value = `${hourStr}:00`;
                optionFull.textContent = `${hourStr}:00`;
                timeSelect.appendChild(optionFull);
                if (hour < endHour) {
                    const optionHalf = document.createElement('option');
                    optionHalf.value = `${hourStr}:30`;
                    optionHalf.textContent = `${hourStr}:30`;
                    timeSelect.appendChild(optionHalf);
                }
            }
        });
    }
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('res-date').value;
            const time = document.getElementById('res-time').value;
            const guests = document.getElementById('res-guests').value;
            const name = document.getElementById('res-name').value;
            const email = document.getElementById('res-email').value;
            const phone = document.getElementById('res-phone').value;
            if (!date || !time || !name || !email) {
                return;
            }
            const selectedDate = new Date(date + 'T' + time);
            const now = new Date();
            if (selectedDate < now) {
                alert("Будь ласка, оберіть майбутню дату та час.");
                return;
            }
            try {
                const response = await fetch('http://127.0.0.1:5000/api/reservations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, email, phone, date, time, guests
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    alert("Бронювання підтверджено! Чекаємо на вас.");
                    form.reset();
                    if (timeSelect) {
                        timeSelect.innerHTML = '<option value="" disabled selected>Спочатку оберіть дату</option>';
                        timeSelect.disabled = true;
                    }
                } else {
                    alert("Помилка: " + (data.message || "Не вдалося забронювати столик."));
                }
            } catch (error) {
                console.error("Reservation Error:", error);
                alert("Помилка мережі. Спробуйте ще раз.");
            }
        });
    }
});