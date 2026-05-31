import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import type { AppConfig } from '../../config/configuration'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly resend: Resend | null
  private readonly fromAddress = 'Mafioso <noreply@mafioso.app>'
  private readonly webUrl: string

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY')
    this.resend = apiKey ? new Resend(apiKey) : null
    this.webUrl = config.get<AppConfig>('app')!.webUrl

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — email sending disabled')
    }
  }

  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    if (!this.resend) return
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Welcome to Mafioso!',
        html: `<p>Hi <strong>${username}</strong>,</p>
<p>Your account is ready. Head to <a href="${this.webUrl}">${this.webUrl}</a> to start playing.</p>
<p>— The Mafioso Team</p>`,
      })
    } catch (err: unknown) {
      this.logger.warn(`Failed to send welcome email to ${to}: ${String(err)}`)
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    if (!this.resend) return
    const resetUrl = `${this.webUrl}/reset-password?token=${resetToken}`
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Reset your Mafioso password',
        html: `<p>Click the link below to reset your password (expires in 1 hour):</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
      })
    } catch (err: unknown) {
      this.logger.warn(`Failed to send password reset email to ${to}: ${String(err)}`)
    }
  }
}
