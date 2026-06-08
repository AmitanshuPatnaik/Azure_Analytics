import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  isLogin = true; // 🔥 controls Login vs Signup

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // 🔁 TOGGLE LOGIN / SIGNUP
  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  // 🔐 FORM SUBMIT
  onSubmit(form: NgForm) {

    const data = form.value;

    if (this.isLogin) {

      // LOGIN
      if (!data.email || !data.password) {
        alert("Please enter email and password");
        return;
      }

      console.log("Login:", data);

      this.authService.login(data).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error("Login failed:", err);
          alert("Login failed! Please check your credentials.");
        }
      });

    } else {

      // SIGNUP
      if (!data.name || !data.email || !data.password) {
        alert("Please fill all fields");
        return;
      }

      console.log("Signup:", data);

      alert("Signup successful! Now login.");

      this.isLogin = true; // switch back to login
      form.reset();

    }
  }
}