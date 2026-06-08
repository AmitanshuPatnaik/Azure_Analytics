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

  isLogin = true;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // 🔁 TOGGLE LOGIN / SIGNUP
  toggleMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = null;
  }

  // 🔐 FORM SUBMIT
  onSubmit(form: NgForm) {

    const data = form.value;
    this.errorMessage = null;

    if (this.isLogin) {

      // LOGIN
      if (!data.email || !data.password) {
        this.errorMessage = "Please enter email and password";
        return;
      }

      console.log("Login:", data);

      this.authService.login(data).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error("Login failed:", err);
          this.errorMessage = err.error?.detail || err.error?.message || err.message || "Login failed! Please check your credentials.";
        }
      });

    } else {

      // SIGNUP
      if (!data.name || !data.email || !data.password) {
        this.errorMessage = "Please fill all fields";
        return;
      }

      console.log("Signup:", data);

      this.errorMessage = "Signup successful! Now login.";

      this.isLogin = true; // switch back to login
      form.reset();

    }
  }
}