import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const AccountSettings = () => {
  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">Account Settings</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        Manage your profile and preferences here.
      </p>

      <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Settings className="mr-3 h-6 w-6 text-primary" /> Your Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-foreground leading-relaxed">
          <p>
            This is where you would manage your account details, change password, notification preferences, etc.
            This page is currently under development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;