# 🚨 IMMEDIATE SECURITY ACTIONS REQUIRED

**Date**: April 4, 2026  
**Priority**: CRITICAL  
**Status**: ACTION REQUIRED

---

## ⚠️ CRITICAL: Exposed Secrets in Repository

### Issue
The `.env.local` file containing production secrets is tracked in the git repository and needs immediate remediation.

### Exposed Secrets
```
✗ Supabase URL: https://inibxrznjlosgygggrae.supabase.co
✗ Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✗ Supabase Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✗ Gelato API Key: bce05eb7-056d-459e-8010-a77f47f9da20...
✗ Gelato Webhook Secret: MITnOed98IQ8mwgrDNd5V4kodjAkxdiKu6HYwZRBX3JRzzjWky
✗ XRoute API Key: 7704c40556b9400991514aa63351ed65
```

---

## 📋 Step-by-Step Remediation Plan

### Step 1: Remove File from Git Tracking (IMMEDIATE)

```bash
# Stop tracking .env.local (but keep local copy)
git rm --cached .env.local

# Commit the removal
git commit -m "security: Remove .env.local from repository"

# Push to remote
git push origin main
```

**Note**: The `.gitignore` already includes `.env*.local`, so this will prevent future commits.

---

### Step 2: Remove from Git History (CRITICAL)

The file exists in git history and must be purged. Choose ONE method:

#### Option A: Using git filter-repo (Recommended)
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove file from entire history
git filter-repo --path .env.local --invert-paths

# Force push to all branches
git push origin --force --all
git push origin --force --tags
```

#### Option B: Using BFG Repo-Cleaner (Alternative)
```bash
# Download BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove file from history
java -jar bfg.jar --delete-files .env.local

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

**⚠️ WARNING**: Force pushing rewrites history. Coordinate with all team members!

---

### Step 3: Rotate ALL Exposed Secrets (CRITICAL)

#### 3.1 Supabase Secrets

1. **Log into Supabase Dashboard**: https://app.supabase.com
2. **Navigate to**: Project Settings → API
3. **Generate New Service Role Key**:
   - Click "Reset service_role key"
   - Copy new key to secure location
4. **Update Environment Variables**:
   ```bash
   # Update .env.local (local development)
   SUPABASE_SERVICE_ROLE_KEY=<new_key>
   
   # Update production environment (Vercel/hosting platform)
   ```

**Note**: Anon key and URL can remain the same (they're public), but service role key MUST be rotated.

#### 3.2 Gelato API Credentials

1. **Log into Gelato Dashboard**: https://dashboard.gelato.com
2. **Navigate to**: Settings → API Keys
3. **Revoke Old Key**: Delete the exposed API key
4. **Generate New Key**: Create new API key
5. **Generate New Webhook Secret**: Create new webhook secret
6. **Update Environment Variables**:
   ```bash
   GELATO_API_KEY=<new_key>
   GELATO_WEBHOOK_SECRET=<new_secret>
   ```
7. **Update Webhook Configuration**: Update webhook URL with new secret

#### 3.3 XRoute API Key

1. **Log into XRoute Dashboard**: https://xroute.ai
2. **Navigate to**: API Keys
3. **Revoke Old Key**: Delete exposed key
4. **Generate New Key**: Create new API key
5. **Update Environment Variables**:
   ```bash
   XROUTE_API_KEY=<new_key>
   ```

#### 3.4 Stripe Secrets (If Configured)

If you've configured Stripe in production:
1. **Log into Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to**: Developers → API Keys
3. **Roll Keys**: Click "Roll key" for secret key
4. **Update Webhook Secret**: Regenerate webhook signing secret
5. **Update Environment Variables**

---

### Step 4: Audit Access Logs

Check for unauthorized access using exposed credentials:

#### Supabase Audit
```sql
-- Check for suspicious queries
SELECT * FROM auth.audit_log_entries
WHERE created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 100;
```

#### Gelato Audit
- Check order history for unauthorized orders
- Review API usage logs

#### XRoute Audit
- Check API usage logs
- Review billing for unexpected charges

---

### Step 5: Update Production Environment

#### Vercel (if using)
```bash
# Update environment variables
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

vercel env rm GELATO_API_KEY production
vercel env add GELATO_API_KEY production

vercel env rm GELATO_WEBHOOK_SECRET production
vercel env add GELATO_WEBHOOK_SECRET production

vercel env rm XROUTE_API_KEY production
vercel env add XROUTE_API_KEY production

# Redeploy
vercel --prod
```

#### Other Hosting Platforms
Update environment variables through your hosting platform's dashboard.

---

### Step 6: Implement Secret Scanning

#### GitHub Secret Scanning (Free for Public Repos)
1. Enable in repository settings
2. Configure notifications

#### Pre-commit Hook
```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# Install hooks
pre-commit install

# Create baseline
detect-secrets scan > .secrets.baseline

# Test
pre-commit run --all-files
```

#### GitHub Actions Workflow
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

---

### Step 7: Team Communication

**Send to all team members**:

```
🚨 SECURITY ALERT: Secret Rotation Required

We've identified that .env.local was accidentally committed to the repository 
with production secrets. We're taking immediate action:

1. ✅ File removed from repository
2. 🔄 All secrets being rotated
3. 📝 Git history being cleaned

ACTION REQUIRED:
- Pull latest changes after history rewrite
- Update your local .env.local with new secrets (will be shared securely)
- Never commit .env.local (already in .gitignore)

Questions? Contact [security lead]
```

---

## 📊 Verification Checklist

After completing all steps:

- [ ] `.env.local` removed from git tracking
- [ ] `.env.local` removed from git history
- [ ] Force push completed successfully
- [ ] All team members notified
- [ ] Supabase service role key rotated
- [ ] Gelato API key rotated
- [ ] Gelato webhook secret rotated
- [ ] XRoute API key rotated
- [ ] Stripe keys rotated (if applicable)
- [ ] Production environment variables updated
- [ ] Application redeployed with new secrets
- [ ] Access logs audited for suspicious activity
- [ ] Secret scanning implemented
- [ ] Pre-commit hooks installed
- [ ] Team trained on secret management

---

## 🔐 Best Practices Going Forward

### 1. Never Commit Secrets
- Always use `.env.local` for local secrets
- Use environment variables in production
- Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

### 2. Use Secret Management
```bash
# Example: Using doppler
doppler setup
doppler run -- npm run dev
```

### 3. Regular Secret Rotation
- Rotate secrets every 90 days
- Rotate immediately if exposure suspected
- Document rotation procedures

### 4. Access Control
- Limit who has access to production secrets
- Use role-based access control
- Audit access regularly

### 5. Monitoring
- Monitor for secret exposure in commits
- Set up alerts for suspicious API usage
- Regular security audits

---

## 📞 Emergency Contacts

**If you discover additional exposed secrets**:
1. Immediately revoke/rotate the secret
2. Notify security team
3. Audit access logs
4. Document incident

**Security Team**:
- Email: security@monowaves.com
- Slack: #security-incidents
- On-call: [phone number]

---

## 📚 Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Last Updated**: April 4, 2026  
**Next Review**: After all actions completed  
**Status**: 🔴 CRITICAL - IMMEDIATE ACTION REQUIRED
